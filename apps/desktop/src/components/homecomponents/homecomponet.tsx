import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { FolderCard } from "./foldercard"
import { NoteCard } from "./notecard"
import { VideoCardHome } from "./videocard-home"
import { useNotes, useDeleteNote, useCreateNote } from "@/hooks/use-notes"
import {
  useFolders,
  useDeleteFolder,
  useCreateFolder,
} from "@/hooks/use-folders"
import { useMyVideos, useDeleteVideo } from "@/hooks/use-videos"
import { useState, useMemo, useCallback } from "react"
import { Spinner } from "@workspace/ui/components/spinner"
import { DndSidebarProvider } from "../sidebarcomponents/dnd-provider"
import { groupByTime } from "@/lib/timegroup"
import type { NoteListItem, Folder, Video as VideoType } from "@/lib/api-types"
import { cn } from "@workspace/ui/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogHeader,
  AlertDialogFooter,
} from "@workspace/ui/components/alert-dialog"
import { toast } from "sonner"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { FOLDER_COLORS } from "@/lib/foldercolor"
import { VideoGenerationModal } from "../videos/videogenerationmodal"
import { useSession } from "@/hooks/use-auth"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert01FreeIcons, Delete02FreeIcons, GridViewFreeIcons, Home03FreeIcons, LeftToRightListBulletFreeIcons, Search01FreeIcons, SlidersHorizontalFreeIcons } from "@hugeicons/core-free-icons"
import { AlertTriangle, Grid2X2, Home, List, Search, SlidersHorizontal, Trash } from "lucide-react"
import { Logo } from "@/components/logo"

type SortOption = "A-Z" | "Z-A" | "Newest" | "Oldest"
type ViewFilter = "all" | "notes" | "videos"

// Unified item type for mixed sorting
type WorkspaceItem =
  | { _type: "note"; _title: string; _date: string; data: NoteListItem }
  | { _type: "folder"; _title: string; _date: string; data: Folder }
  | { _type: "video"; _title: string; _date: string; data: VideoType }

export function HomeComponent() {
  const { data: notes, isLoading: isLoadingNotes } = useNotes()
  const { data: folders, isLoading: isLoadingFolders } = useFolders()
  const { data: videos, isLoading: isLoadingVideos } = useMyVideos()
  const { mutateAsync: deleteNote } = useDeleteNote()
  const { mutateAsync: deleteFolder } = useDeleteFolder()
  const { mutateAsync: deleteVideo } = useDeleteVideo()
  const { mutateAsync: createNote } = useCreateNote()
  const { mutateAsync: createFolder } = useCreateFolder()
  const {data:session}=useSession()

  const [searchQuery, setSearchQuery] = useState("")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [sortOption, setSortOption] = useState<SortOption>("Newest")
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all")
  const [opengeneratevideo, setopengeneratevideo] = useState(false)

  // Multi-select state
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set())
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalSelected =
    selectedNotes.size + selectedFolders.size + selectedVideos.size

  const toggleNoteSelect = useCallback((id: string) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleFolderSelect = useCallback((id: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleVideoSelect = useCallback((id: string) => {
    setSelectedVideos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedNotes(new Set())
    setSelectedFolders(new Set())
    setSelectedVideos(new Set())
  }, [])

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    try {
      const promises: Promise<any>[] = []
      selectedNotes.forEach((id) => promises.push(deleteNote(id)))
      selectedFolders.forEach((id) => promises.push(deleteFolder(id)))
      selectedVideos.forEach((id) => promises.push(deleteVideo(id)))
      await Promise.all(promises)
      toast.success(
        `Deleted ${totalSelected} item${totalSelected > 1 ? "s" : ""}`
      )
      clearSelection()
    } catch {
      toast.error("Some items failed to delete")
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Filter + search
  const filteredNotes = useMemo(() => {
    if (!notes) return []
    const q = searchQuery.toLowerCase().trim()
    if (!q) return notes
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.preview?.toLowerCase().includes(q)
    )
  }, [notes, searchQuery])

  const filteredFolders = useMemo(() => {
    if (!folders) return []
    const q = searchQuery.toLowerCase().trim()
    if (!q) return folders
    return folders.filter((f) => f.name.toLowerCase().includes(q))
  }, [folders, searchQuery])

  const filteredVideos = useMemo(() => {
    if (!videos) return []
    const q = searchQuery.toLowerCase().trim()
    if (!q) return videos
    return videos.filter((v) => (v.title || "").toLowerCase().includes(q))
  }, [videos, searchQuery])

  // Combine and sort
  const combinedItems = useMemo(() => {
    let items: WorkspaceItem[] = []

    if (viewFilter === "all") {
      items = [
        ...filteredFolders.map((f) => ({
          _type: "folder" as const,
          _title: f.name,
          _date: f.updatedAt,
          data: f,
        })),
        ...filteredNotes.map((n) => ({
          _type: "note" as const,
          _title: n.title,
          _date: n.updatedAt,
          data: n,
        })),
        ...filteredVideos.map((v) => ({
          _type: "video" as const,
          _title: v.title || "Untitled Video",
          _date: v.updatedAt,
          data: v,
        })),
      ]
    } else if (viewFilter === "notes") {
      items = filteredNotes.map((n) => ({
        _type: "note" as const,
        _title: n.title,
        _date: n.updatedAt,
        data: n,
      }))
    } else if (viewFilter === "videos") {
      items = filteredVideos.map((v) => ({
        _type: "video" as const,
        _title: v.title || "Untitled Video",
        _date: v.updatedAt,
        data: v,
      }))
    }

    items.sort((a, b) => {
      if (sortOption === "A-Z") return a._title.localeCompare(b._title)
      if (sortOption === "Z-A") return b._title.localeCompare(a._title)
      if (sortOption === "Newest")
        return new Date(b._date).getTime() - new Date(a._date).getTime()
      if (sortOption === "Oldest")
        return new Date(a._date).getTime() - new Date(b._date).getTime()
      return 0
    })

    return items
  }, [filteredNotes, filteredFolders, filteredVideos, sortOption, viewFilter])

  // Group by time
  const timeGroups = useMemo(() => {
    return groupByTime(
      combinedItems.map((item) => ({
        ...item,
        updatedAt: item._date,
      }))
    )
  }, [combinedItems])

  const allFolders = folders || []
  const isLoading = isLoadingNotes || isLoadingFolders || isLoadingVideos

  const handleCreateNote = async () => {
    try {
      await createNote({ title: "New Note" })
      toast.success("Note created successfully")
    } catch (error) {
      toast.error("Error creating note")
    }
  }

  const handleCreateFolder = async () => {
    try {
      await createFolder({ name: "New Folder", color: FOLDER_COLORS[0].value })
      toast.success("Folder created successfully")
    } catch (error) {
      toast.error("Error creating folder")
    }
  }

  const renderItem = (item: WorkspaceItem) => {
    if (item._type === "folder") {
      return (
        <FolderCard
          key={`folder-${item.data.id}`}
          folder={item.data}
          view={view}
          isSelected={selectedFolders.has(item.data.id)}
          onToggleSelect={toggleFolderSelect}
        />
      )
    }
    if (item._type === "video") {
      return (
        <VideoCardHome
          key={`video-${item.data.id}`}
          video={item.data as VideoType}
          view={view}
          isSelected={selectedVideos.has(item.data.id)}
          onToggleSelect={toggleVideoSelect}
        />
      )
    }
    return (
      <NoteCard
        key={`note-${item.data.id}`}
        note={item.data as NoteListItem}
        view={view}
        isSelected={selectedNotes.has(item.data.id)}
        onToggleSelect={toggleNoteSelect}
      />
    )
  }

  return (
    <>
      <DndSidebarProvider allFolders={allFolders}>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl p-4 pb-28">
            {/* Header */}
            <div className="mb-4 flex items-center gap-2">
              <SidebarTrigger className="cursor-pointer" />
              <Home  className="h-4 w-4  " />
              <p className="font-medium text-foreground">Home</p>
            </div>

            {/* Search Bar */}
            <div className="mb-4 flex items-center rounded-full border border-border/60 bg-muted/50 p-2">
              <div className="flex flex-1 items-center px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 border-none bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-0.5 pr-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setView("grid")}
                  className={cn(
                    "cursor-pointer rounded-lg",
                    view === "grid" && "bg-accent text-accent-foreground"
                  )}
                >
                  <Grid2X2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setView("list")}
                  className={cn(
                    "cursor-pointer rounded-lg",
                    view === "list" && "bg-accent text-accent-foreground"
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filter Tabs + Sort */}
            <div className="mb-4 flex items-center justify-between">
              <Tabs
                value={viewFilter}
                onValueChange={(v) => setViewFilter(v as ViewFilter)}
              >
                <TabsList>
                  <TabsTrigger value="all" className="cursor-pointer">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="cursor-pointer">
                    Notes
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="cursor-pointer">
                    Videos
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer gap-1.5 text-muted-foreground"
                  >
                    {sortOption}
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["A-Z", "Z-A", "Newest", "Oldest"] as SortOption[]).map(
                    (opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() => setSortOption(opt)}
                        className={cn(
                          "cursor-pointer",
                          sortOption === opt && "font-semibold"
                        )}
                      >
                        {opt}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Spinner className="size-8" />
              </div>
            ) : combinedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                {searchQuery.trim() ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Search />
                      </EmptyMedia>
                      <EmptyTitle>No Results</EmptyTitle>
                      <EmptyDescription>
                        No results found for "{searchQuery}". Try searching for
                        something else.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent
                      className="flex-row justify-center gap-2"
                      onClick={() => setSearchQuery("")}
                    >
                      <Button variant="default" className="cursor-pointer">
                        Clear Search
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Logo width={32} height={32} className="text-foreground" />
                      </EmptyMedia>
                      <EmptyTitle>
                        No {viewFilter === "videos" ? "videos" : "notes"} Yet
                      </EmptyTitle>
                      <EmptyDescription>
                        You haven&apos;t created any{" "}
                        {viewFilter === "videos"
                          ? "videos yet Get started by generating your first video"
                          : "notes or folders yet Get started by creating your first note or folder"}
                        .
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="flex-row justify-center gap-2">
                      {viewFilter === "videos" ? (
                        <Button
                          onClick={() => {
                            if (
                              !session &&
                              (!localStorage ||
                                !localStorage.getItem("foldex_user_id"))
                            ) {
                              toast.info(
                                "You need to sign in to generate a video."
                              )
                              return
                            }
                            setopengeneratevideo(true)
                          }}
                          className="cursor-pointer"
                        >
                          Generate Video
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={handleCreateNote}
                            className="cursor-pointer"
                          >
                            Create Note
                          </Button>
                          <Button
                            onClick={handleCreateFolder}
                            className="cursor-pointer"
                          >
                            Create Folder
                          </Button>
                        </>
                      )}
                    </EmptyContent>
                  </Empty>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {timeGroups.map((group) => (
                  <div key={group.label}>
                    <h3 className="mb-3 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {group.label}
                    </h3>
                    {view === "grid" ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {group.items.map((item) =>
                          renderItem(item as WorkspaceItem)
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {group.items.map((item) =>
                          renderItem(item as WorkspaceItem)
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floating Delete Bar */}
          {totalSelected > 0 && (
            <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in duration-200 fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 rounded-full bg-foreground px-5 py-2.5 text-background shadow-2xl">
                <span className="text-sm font-medium">
                  {totalSelected} item{totalSelected > 1 ? "s" : ""} selected
                </span>
                <div className="h-4 w-px bg-background/20" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-7 cursor-pointer px-2 text-background/70 hover:bg-background/10 hover:text-background"
                >
                  Deselect
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-7 cursor-pointer gap-1.5 px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Bulk Delete Confirmation */}
          <AlertDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
          >
            <AlertDialogContent className="sm:max-w-[425px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete {totalSelected} item{totalSelected > 1 ? "s" : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete{" "}
                  {selectedNotes.size > 0 &&
                    `${selectedNotes.size} note${selectedNotes.size > 1 ? "s" : ""}`}
                  {selectedNotes.size > 0 &&
                    (selectedFolders.size > 0 || selectedVideos.size > 0) &&
                    " and "}
                  {selectedFolders.size > 0 &&
                    `${selectedFolders.size} folder${selectedFolders.size > 1 ? "s" : ""} (including all contents)`}
                  {selectedFolders.size > 0 &&
                    selectedVideos.size > 0 &&
                    " and "}
                  {selectedVideos.size > 0 &&
                    `${selectedVideos.size} video${selectedVideos.size > 1 ? "s" : ""}`}
                  . This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DndSidebarProvider>
      <VideoGenerationModal
        open={opengeneratevideo}
        onOpenChange={setopengeneratevideo}
      />
    </>
  )
}
