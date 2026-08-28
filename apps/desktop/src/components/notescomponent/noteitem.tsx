import { useTabNavigation } from "@/hooks/useTabNavigation";
import {
  FileText,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Trash,
  TrashIcon,
  Pin,
} from "lucide-react";

import { useDraggable } from "@dnd-kit/core";
import { useDeleteNote, useUpdateNote, useNote } from "@/hooks/use-notes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import UpdateTitle from "./update-title";
import DeleteDialog from "../deletedialog";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import MoveNote from "./movenote";
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@workspace/ui/components/context-menu";

interface NoteItemProps {
  noteId: string;
  title: string;
  folderId?: string;
  isActive?: boolean;
}
const NoteItem = ({ title, folderId, noteId, isActive }: NoteItemProps) => {
  const { openInTab } = useTabNavigation();
  const {mutateAsync:deletenote,isPending:isDeleting,error:deleteError} = useDeleteNote();
  const {mutateAsync:updateNote} = useUpdateNote();
  const {data:note} = useNote(noteId); // Fetch to get isPinned status, might be cached from list
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openRenameDialog, setOpenRenameDialog] = useState(false);
  const [openMoveDialog, setOpenMoveDialog] = useState(false);

  // DnD - make this note draggable
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `note-${noteId}`,
    data: {
      type: "note",
      id: noteId,
      label: title,
      parentId: folderId,
    },
  });

  const handledelete = async () => {
    try {
      await deletenote(noteId)
      toast.success("Note deleted successfully");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const handleTogglePin = async () => {
    try {
      await updateNote({
        id: noteId,
        data: { isPinned: !(note?.isPinned) }
      });
      toast.success(note?.isPinned ? "Note unpinned" : "Note pinned");
    } catch {
      toast.error("Failed to pin/unpin note");
    }
  };
  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger asChild>
      <div
        ref={setNodeRef}
        className={cn(
          "group/item  flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm  w-full overflow-hidden",
          isActive ? "bg-primary/10 dark:bg-primary/10 font-medium text-foreground":"text-muted-foreground transition-colors hover:bg-accent/50",
          isDragging && "cursor-grabbing opacity-40",
        )}
        onClick={() => openInTab('note', noteId, folderId as string, title)}
        {...listeners}
        {...attributes}
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate min-w-0">{title}</span>
        
      </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem onClick={() => setOpenRenameDialog(true)} className="cursor-pointer">
            <Pencil className=" mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setOpenMoveDialog(true)} className="cursor-pointer">
            <FolderInput className="h-4 w-4 mr-2" />
            Move to...
          </ContextMenuItem>
          <ContextMenuItem onClick={handleTogglePin} className="cursor-pointer">
            <Pin className="h-4 w-4 mr-2" />
            {note?.isPinned ? "Unpin" : "Pin"}
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem variant="destructive" onClick={() => setOpenDeleteDialog(true)} className="cursor-pointer">
            <TrashIcon />
            Delete
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
      </ContextMenu>
      <UpdateTitle
        open={openRenameDialog}
        onOpenChange={setOpenRenameDialog}
        noteId={noteId}
      />
      <DeleteDialog
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        title="Delete Note"
        description={`Are you sure you want to delete ${title} This action cannot be undone.`}
        itemName={title}
        onConfirm={handledelete}
      />
      <MoveNote
        open={openMoveDialog}
        onOpenChange={setOpenMoveDialog}
        noteId={noteId}
        folderId={folderId}
      />
    </>
  );
};

export default NoteItem;