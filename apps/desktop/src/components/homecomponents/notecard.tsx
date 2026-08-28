import { FileText, Pencil, Pin, Trash, FolderInput } from "lucide-react";
import type { NoteListItem } from "@/lib/api-types";
import { formatRelativeDate } from "@/lib/timegroup";
import { useTabNavigation } from "@/hooks/useTabNavigation";
import { useDeleteNote, useUpdateNote, useNote } from "@/hooks/use-notes";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@workspace/ui/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import UpdateTitle from "../notescomponent/update-title";
import DeleteDialog from "../deletedialog";
import MoveNote from "../notescomponent/movenote";

interface NoteCardProps {
  note: NoteListItem;
  view: "grid" | "list";
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function NoteCard({ note, view, isSelected, onToggleSelect }: NoteCardProps) {
  const { openInTab } = useTabNavigation();
  const { mutateAsync: deleteNote } = useDeleteNote();
  const { mutateAsync: updateNote } = useUpdateNote();
  const { data: fullNote } = useNote(note.id);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openRenameDialog, setOpenRenameDialog] = useState(false);
  const [openMoveDialog, setOpenMoveDialog] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `note-${note.id}`,
    data: {
      type: "note",
      id: note.id,
      label: note.title,
      parentId: note.folderId,
    },
  });

  const handleDelete = async () => {
    try {
      await deleteNote(note.id);
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const handleTogglePin = async () => {
    try {
      await updateNote({ id: note.id, data: { isPinned: !note.isPinned } });
      toast.success(note.isPinned ? "Note unpinned" : "Note pinned");
    } catch {
      toast.error("Failed to update note");
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // If checkbox area, don't navigate
    if ((e.target as HTMLElement).closest("[data-checkbox]")) return;
    openInTab("note", note.id, note.folderId || undefined, note.title);
  };

  const contextMenuContent = (
    <ContextMenuContent>
      <ContextMenuGroup>
        <ContextMenuItem onClick={() => setOpenRenameDialog(true)} className="cursor-pointer">
          <Pencil className="mr-2 h-4 w-4" /> Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setOpenMoveDialog(true)} className="cursor-pointer">
          <FolderInput className="mr-2 h-4 w-4" /> Move to...
        </ContextMenuItem>
        <ContextMenuItem onClick={handleTogglePin} className="cursor-pointer">
          <Pin className="mr-2 h-4 w-4" /> {fullNote?.isPinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuItem variant="destructive" onClick={() => setOpenDeleteDialog(true)} className="cursor-pointer">
          <Trash className="mr-2 h-4 w-4" /> Delete
        </ContextMenuItem>
      </ContextMenuGroup>
    </ContextMenuContent>
  );

  // ─── LIST VIEW ───
  if (view === "list") {
    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              ref={setNodeRef}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent/50",
                isDragging && "opacity-40",
                isSelected && "bg-primary/5"
              )}
              onClick={handleClick}
              {...listeners}
              {...attributes}
            >
              {/* Checkbox */}
              <div
                data-checkbox
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(note.id);
                }}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded border-2 transition-colors flex items-center justify-center cursor-pointer",
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/40 hover:border-primary/60"
                  )}
                >
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>

              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-medium truncate">{note.title}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden md:block">
                {note.preview || "Empty note"}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatRelativeDate(note.updatedAt)}
              </span>
            </div>
          </ContextMenuTrigger>
          {contextMenuContent}
        </ContextMenu>

        <UpdateTitle open={openRenameDialog} onOpenChange={setOpenRenameDialog} noteId={note.id} />
        <DeleteDialog
          open={openDeleteDialog}
          onOpenChange={setOpenDeleteDialog}
          title="Delete Note"
          description="Are you sure you want to delete this note? This action is permanent and cannot be undone."
          itemName={note.title}
          onConfirm={handleDelete}
        />
        <MoveNote open={openMoveDialog} onOpenChange={setOpenMoveDialog} noteId={note.id} folderId={note.folderId || undefined} />
      </>
    );
  }

  // ─── GRID VIEW ───
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            ref={setNodeRef}
            className={cn(
              "group cursor-pointer flex flex-col gap-2",
              isDragging && "opacity-40"
            )}
            onClick={handleClick}
            {...listeners}
            {...attributes}
          >
            <div className={cn(
              "relative bg-muted/40 group-hover:bg-muted/60 transition-colors rounded-2xl aspect-[4/5] flex items-stretch p-3 border border-transparent group-hover:border-border/50 overflow-hidden",
              isSelected && "border-primary/50 bg-primary/5"
            )}>
              {/* Checkbox overlay */}
              <div
                data-checkbox
                className={cn(
                  "absolute top-2 left-2 z-10 transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(note.id);
                }}
              >
                <div
                  className={cn(
                    "h-5 w-5 rounded border-2 transition-colors flex items-center justify-center cursor-pointer bg-background/80 backdrop-blur-sm",
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/40 hover:border-primary/60"
                  )}
                >
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>

              {/* Paper preview */}
              <div className="bg-background w-full h-full rounded-xl shadow-sm border border-border/60 p-3 overflow-hidden flex flex-col gap-1.5 transition-transform group-hover:-translate-y-0.5">
                <h4 className="text-xs font-semibold text-foreground truncate">{note.title}</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-6">
                  {note.preview || "Empty note"}
                </p>
              </div>
            </div>

            {/* Meta below */}
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2 truncate pr-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate text-foreground">{note.title}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatRelativeDate(note.updatedAt)}</span>
            </div>
          </div>
        </ContextMenuTrigger>
        {contextMenuContent}
      </ContextMenu>

      <UpdateTitle open={openRenameDialog} onOpenChange={setOpenRenameDialog} noteId={note.id} />
      <DeleteDialog
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action is permanent and cannot be undone."
        itemName={note.title}
        onConfirm={handleDelete}
      />
      <MoveNote open={openMoveDialog} onOpenChange={setOpenMoveDialog} noteId={note.id} folderId={note.folderId || undefined} />
    </>
  );
}