import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { useMemo, useState } from "react";
import {
  Check,
  Folder,
  Loader2,
  Notebook,
  NotebookIcon,
  Search,
} from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import { useFolders } from "@/hooks/use-folders";
import { useMoveNote, useNote } from "@/hooks/use-notes";


interface MoveNoteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  folderId?: string;
}
const MoveNote = ({ open, onOpenChange, noteId, folderId }: MoveNoteProps) => {

  const {data:folders,isLoading:foldersLoading} = useFolders();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const {mutateAsync:moveNote,isPending:moveNoteLoading} = useMoveNote();
  const {data:note,isLoading:noteLoading} = useNote(noteId);
  const filteredFolders = useMemo(() => {
    if (!folders) return [];

    let filtered = folders
      .filter((f) => f.id !== folderId)
      .filter((f) => f.parentId !== folderId);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((f) => f.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [folders, folderId, searchQuery]);

  // Group folders by parent
  const groupedFolders = useMemo(() => {
    const rootFolders = filteredFolders.filter((f) => !f.parentId);
    const childFolders = filteredFolders.filter((f) => f.parentId);

    return { rootFolders, childFolders };
  }, [filteredFolders]);
  const handleMove = async () => {
    try {
      if (!selectedFolderId) {
        throw new Error("No folder selected");
      }
      await moveNote({
        id: noteId,
        folderId: selectedFolderId === "root" ? null : selectedFolderId,
      });
      onOpenChange(false);
      setSelectedFolderId(null);
      setSearchQuery("");
      toast.success("Note moved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to move note");
    } 
  };
  const handleCancel = () => {
    setSelectedFolderId(null);
    setSearchQuery("");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 space-y-4">
          <DialogTitle className="text-xl">
            Move{" "}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-sm font-medium">
              <Notebook className="w-4 h-4" />
              {note?.title}
            </span>{" "}
            to...
          </DialogTitle>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search destinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {filteredFolders.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Folder />
                </EmptyMedia>
                <EmptyTitle>
                  {searchQuery ? "No folders found" : "No Folders Yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {searchQuery
                    ? `No folders match "${searchQuery}"`
                    : "You haven't created any folders yet to move to."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {/* Root Section */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                  Personal
                </div>
                {/* Workspace Root */}
                {(!searchQuery || "workspace root".includes(searchQuery.toLowerCase())) && folderId && (
                  <button
                    onClick={() => setSelectedFolderId("root")}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      selectedFolderId === "root"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <NotebookIcon className="w-4 h-4 ml-6" />
                    <span className="flex-1">Workspace Root</span>
                    {selectedFolderId === "root" && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                )}
                {/* Root Folders */}
                {groupedFolders.rootFolders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFolderId(f.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      selectedFolderId === f.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Folder className="w-4 h-4 ml-6" />
                    <span className="flex-1">{f.name}</span>
                    {selectedFolderId === f.id && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}

                {/* Child Folders (indented) */}
                {groupedFolders.childFolders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFolderId(f.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      selectedFolderId === f.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Folder className="w-4 h-4 ml-12" />
                    <span className="flex-1">{f.name}</span>
                    {selectedFolderId === f.id && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 ">
          <Button variant="outline" onClick={handleCancel} disabled={moveNoteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={moveNoteLoading || !selectedFolderId}
            className="bg-primary hover:bg-primary/90"
          >
            {moveNoteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Move here"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MoveNote;