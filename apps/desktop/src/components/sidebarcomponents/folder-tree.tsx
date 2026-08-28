import React, { useMemo, useState } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import type { Folder as FolderType, NoteListItem, Video as VideoType } from "@/lib/api-types";
import { 
  ChevronRight, 
  ChevronDown, 
  FolderIcon, 
  Pencil, 
  Trash,
  Plus,
  Pin,
  PinOff,
  Palette,
  Check,
  FolderOpen,
  Folder,
  Video
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import NoteItem from "../notescomponent/noteitem";
import VideoItem from "../videos/videoitem";
import { VideoGenerationModal } from "../videos/videogenerationmodal";
import { useDeleteFolder, useUpdateFolder } from "@/hooks/use-folders";
import { useCreateNote } from "@/hooks/use-notes";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from "@workspace/ui/components/context-menu";
import DeleteDialog from "../deletedialog";
// Rename dialog is just an update title dialog, usually reused
// We'll just define the props we need, might need to import your actual update title dialog.
import UpdateTitle from "../notescomponent/update-title"; 
import { FOLDER_COLORS, getFolderColor } from "@/lib/foldercolor";
import UpdateFolderTitle from "../update-folder-title";
import { useTabStore } from "@/stores/tabstore";
import { useParams, useSearch } from "@tanstack/react-router";

const COLORS = [
  { name: "Default", value: "default" },
  { name: "Red", value: "red" },
  { name: "Orange", value: "orange" },
  { name: "Yellow", value: "yellow" },
  { name: "Green", value: "green" },
  { name: "Blue", value: "blue" },
  { name: "Purple", value: "purple" },
  { name: "Pink", value: "pink" },
];

export function FolderTreeItem({
  folder,
  allFolders,
  allNotes,
  allVideos = [],
  sortOption = "A-Z",
  depth = 0,
}: {
  folder: FolderType;
  allFolders: FolderType[];
  allNotes: NoteListItem[];
  allVideos?: VideoType[];
  sortOption?: "A-Z" | "Z-A" | "Newest" | "Oldest";
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const { noteId, videoId } = useParams({ strict: false });
  const searchParams = useSearch({ strict: false }) as { folderId?: string };
 

  const { mutateAsync: deleteFolder } = useDeleteFolder();
  const { mutateAsync: updateFolder } = useUpdateFolder();
  const { mutateAsync: createNote } = useCreateNote();

  // Drag config
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: `folder-${folder.id}`,
    data: {
      type: "folder",
      id: folder.id,
      label: folder.name,
      parentId: folder.parentId,
    },
  });

  // Drop config
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: folder.id,
    data: {
      type: "folder",
      id: folder.id,
    },
  });

  // Combine refs so root element allows both drag and drop
  const setRefs = (element: HTMLElement | null) => {
    setDroppableRef(element);
    setDraggableRef(element);
  };

  // derived lists
  const childFolders = allFolders.filter((f) => f.parentId === folder.id);
  const childNotes = allNotes.filter((n) => n.folderId === folder.id);
  const childVideos = allVideos.filter((v) => v.folderId === folder.id);
  
  const combinedChildren = [
    ...childFolders.map(f => ({ ...f, _type: "folder" as const, _title: f.name, _date: f.updatedAt })),
    ...childNotes.map(n => ({ ...n, _type: "note" as const, _title: n.title, _date: n.updatedAt })),
    ...childVideos.map(v => ({ ...v, _type: "video" as const, _title: v.title || "Untitled Video", _date: v.updatedAt })),
  ];

  combinedChildren.sort((a, b) => {
    if (sortOption === "A-Z") return a._title.localeCompare(b._title);
    if (sortOption === "Z-A") return b._title.localeCompare(a._title);
    if (sortOption === "Newest") return new Date(b._date).getTime() - new Date(a._date).getTime();
    if (sortOption === "Oldest") return new Date(a._date).getTime() - new Date(b._date).getTime();
    return 0;
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const handleDelete = async () => {
    try {
      await deleteFolder(folder.id);
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  const handleCreateNote = async () => {
    try {
      await createNote({
        title: "New Note",
        folderId: folder.id,
      });
      setIsOpen(true);
      toast.success("Note created");
    } catch {
      toast.error("Failed to create note");
    }
  };

  const handleTogglePin = async () => {
    try {
      await updateFolder({
        id: folder.id,
        data: { isPinned: !folder.isPinned }
      });
      toast.success(folder.isPinned ? "Folder unpinned" : "Folder pinned");
    } catch {
      toast.error("Failed to pin/unpin");
    }
  };

  const handleChangeColor = async (color: string) => {
    try {
      await updateFolder({
        id: folder.id,
        data: { color }
      });
    } catch {
      toast.error("Failed to update color");
    }
  }

  
  const folderColor = getFolderColor(folder.color);
  const hasChildren = childFolders.length > 0 || childNotes.length > 0 || childVideos.length > 0;
  const isChildActive = searchParams.folderId === folder.id;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            ref={setRefs}
            className={cn(
              "group/folder  flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm  transition-colors hover:bg-accent/50",
              isDragging && "opacity-40 cursor-grabbing",
              isOver && "bg-primary/20 hover:bg-primary/20 ring-1 ring-primary",
              isChildActive 
                            ? "bg-accent/50 text-foreground font-medium" 
                            : "text-muted-foreground hover:bg-accent/50"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            {...listeners}
            {...attributes}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
              setIsExpanded(!isExpanded);
            }}
          >
          <button
          className={cn(
            "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-sm p-0.5 transition-colors hover:bg-[#f4f2ea] dark:hover:bg-[#1c261f] cursor-pointer",
          )}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            <>
              <span className="absolute inset-0 flex items-center justify-center transition-all duration-150 group-hover/item:scale-90 group-hover/item:opacity-0 ">
                {isExpanded ? (
                  <FolderOpen
                    className="h-4 w-4 shrink-0"
                    style={{ color: folderColor, fill: folderColor, stroke: folderColor }}
                  />
                ) : (
                  <Folder
                    className="h-4 w-4 shrink-0"
                    style={{ color: folderColor, fill: folderColor, stroke: folderColor }}
                  />
                )}
              </span>
              <ChevronRight
                className={cn(
                  "absolute inset-0 m-auto h-4 w-4 scale-90 opacity-0 transition-all duration-150 group-hover/item:scale-100 group-hover/item:opacity-100",
                  isExpanded && "rotate-90",
                )}
                
              />
            </>
          ) : (
            <Folder
              className="h-4 w-4 shrink-0"
              style={{ color: folderColor, fill: folderColor, stroke: folderColor }}
            />
          )}
        </button>
            <span className="flex-1 truncate select-none">{folder.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuItem onClick={handleCreateNote} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              New note inside
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => {
                if (typeof window !== "undefined" && !localStorage.getItem("foldex_user_id")) {
                    toast.info("You need to sign in to use to generate a video.");
                    return;
                }
                setVideoModalOpen(true);
              }} 
              className="cursor-pointer"
            >
              <Video className="mr-2 h-4 w-4" />
              New video inside
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setRenameDialogOpen(true)} className="cursor-pointer">
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={handleTogglePin} className="cursor-pointer">
              {folder.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
              {folder.isPinned ? "Unpin folder" : "Pin folder"}
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger className="cursor-pointer">
                <Palette className="mr-2 h-4 w-4" />
                Color
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <div className="grid grid-cols-4 gap-2 p-2">
                    {FOLDER_COLORS.map((colorOption) => {
                      const isSelected = folderColor === colorOption.value;
                      return (
                        <button
                          key={colorOption.key}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleChangeColor(colorOption.value);
                          }}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 cursor-pointer",
                            isSelected
                              ? "border-foreground/80 shadow-sm"
                              : "border-transparent"
                          )}
                          style={{ backgroundColor: colorOption.value }}
                          aria-label={`Set folder color to ${colorOption.name}`}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4 text-white" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem variant="destructive" className="cursor-pointer" onClick={() => setDeleteDialogOpen(true)}>
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>

      {isOpen && (
        <div className="flex flex-col">
          {combinedChildren.map((child) => {
            if (child._type === "folder") {
              return (
                <FolderTreeItem
                  key={`folder-${child.id}`}
                  folder={child as any}
                  allFolders={allFolders}
                  allNotes={allNotes}
                  allVideos={allVideos}
                  sortOption={sortOption}
                  depth={depth + 1}
                />
              );
            } else if (child._type === "video") {
              return (
                <div key={`video-${child.id}`} style={{ paddingLeft: `${(depth + 1) * 12}px` }}>
                  <VideoItem
                    videoId={child.id}
                    title={child._title}
                    folderId={folder.id}
                    status={(child as any).status}
                    isActive={child.id === videoId}
                  />
                </div>
              );
            } else {
              return (
                <div key={`note-${child.id}`} style={{ paddingLeft: `${(depth + 1) * 12}px` }}>
                  <NoteItem noteId={child.id} title={child.title} folderId={folder.id} isActive={child.id === noteId} />
                </div>
              );
            }
          })}
        </div>
      )}

      <UpdateFolderTitle 
      open={renameDialogOpen}
      onOpenChange={setRenameDialogOpen}
      folderId={folder.id}
      />
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Folder"
        description={`Are you sure you want to delete ${folder.name}? This will also delete all notes inside it.`}
        itemName={folder.name}
        onConfirm={handleDelete}
      />
      <VideoGenerationModal
        open={videoModalOpen}
        onOpenChange={setVideoModalOpen}
        folderId={folder.id}
      />
    </>
  );
}
