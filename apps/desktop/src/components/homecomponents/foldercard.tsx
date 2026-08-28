import { FolderIcon, Pencil, Pin, Trash, Palette, Check } from "lucide-react";
import type { Folder } from "@/lib/api-types";
import { formatRelativeDate } from "@/lib/timegroup";
import { useUpdateFolder, useDeleteFolder } from "@/hooks/use-folders";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@workspace/ui/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import { FOLDER_COLORS, getFolderColor } from "@/lib/foldercolor";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import UpdateTitle from "../notescomponent/update-title";
import DeleteDialog from "../deletedialog";
import UpdateFolderTitle from "../update-folder-title";

interface FolderCardProps {
  folder: Folder;
  view: "grid" | "list";
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function FolderCard({ folder, view, isSelected, onToggleSelect }: FolderCardProps) {
  const { mutateAsync: updateFolder } = useUpdateFolder();
  const { mutateAsync: deleteFolder } = useDeleteFolder();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openRenameDialog, setOpenRenameDialog] = useState(false);

  const folderColor = getFolderColor(folder.color);

  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", id: folder.id },
  });

  const handleDelete = async () => {
    try {
      await deleteFolder(folder.id);
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  const handleTogglePin = async () => {
    try {
      await updateFolder({ id: folder.id, data: { isPinned: !folder.isPinned } });
      toast.success(folder.isPinned ? "Folder unpinned" : "Folder pinned");
    } catch {
      toast.error("Failed to update folder");
    }
  };

  const handleChangeColor = async (color: string) => {
    try {
      await updateFolder({ id: folder.id, data: { color } });
      toast.success("Folder color updated");
    } catch {
      toast.error("Failed to update folder color");
    }
  };

  const contextMenuContent = (
    <ContextMenuContent>
      <ContextMenuGroup>
        <ContextMenuItem onClick={() => setOpenRenameDialog(true)} className="cursor-pointer">
          <Pencil className="mr-2 h-4 w-4" /> Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={handleTogglePin} className="cursor-pointer">
          <Pin className="mr-2 h-4 w-4" /> {folder.isPinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger className="cursor-pointer">
            <Palette className="mr-2 h-4 w-4" /> Color
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <div className="grid grid-cols-4 gap-2 p-2">
              {FOLDER_COLORS.map((colorOption) => {
                const isColorSelected = folderColor === colorOption.value;
                return (
                  <button
                    key={colorOption.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleChangeColor(colorOption.value);
                    }}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                      isColorSelected ? "border-foreground/80 shadow-sm" : "border-transparent"
                    )}
                    style={{ backgroundColor: colorOption.value }}
                    aria-label={`Set color to ${colorOption.name}`}
                  >
                    {isColorSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </ContextMenuSubContent>
        </ContextMenuSub>
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
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-default transition-colors hover:bg-accent/50",
                isOver && "bg-primary/10 ring-1 ring-primary/30",
                isSelected && "bg-primary/5"
              )}
            >
              {/* Checkbox */}
              <div
                data-checkbox
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(folder.id);
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

              <FolderIcon
                className="h-4 w-4 shrink-0"
                style={{ color: folderColor, fill: folderColor }}
              />
              <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatRelativeDate(folder.updatedAt)}
              </span>
            </div>
          </ContextMenuTrigger>
          {contextMenuContent}
        </ContextMenu>

        <UpdateFolderTitle open={openRenameDialog} onOpenChange={setOpenRenameDialog} folderId={folder.id} />
        <DeleteDialog
          open={openDeleteDialog}
          onOpenChange={setOpenDeleteDialog}
          title="Delete Folder"
          description="Are you sure you want to delete this folder and ALL its contents? This action is permanent and cannot be undone."
          itemName={folder.name}
          onConfirm={handleDelete}
        />
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
            className="group cursor-default flex flex-col gap-2"
          >
            <div className={cn(
              "relative bg-muted/40 group-hover:bg-muted/60 transition-colors rounded-2xl aspect-[4/5] flex items-center justify-center border border-transparent group-hover:border-border/50",
              isOver && "bg-primary/10 border-primary/40 ring-1 ring-primary/30",
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
                  onToggleSelect?.(folder.id);
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

              <FolderIcon
                className="w-20 h-20 drop-shadow-sm"
                style={{ color: folderColor, fill: folderColor, stroke: folderColor }}
              />
            </div>

            {/* Meta below */}
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2 truncate pr-2">
                <FolderIcon
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: folderColor, fill: folderColor }}
                />
                <span className="text-sm font-medium truncate text-foreground">{folder.name}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatRelativeDate(folder.updatedAt)}</span>
            </div>
          </div>
        </ContextMenuTrigger>
        {contextMenuContent}
      </ContextMenu>

      <UpdateFolderTitle open={openRenameDialog} onOpenChange={setOpenRenameDialog} folderId={folder.id} />
      <DeleteDialog
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        title="Delete Folder"
        description="Are you sure you want to delete this folder and ALL its contents? This action is permanent and cannot be undone."
        itemName={folder.name}
        onConfirm={handleDelete}
      />
    </>
  );
}