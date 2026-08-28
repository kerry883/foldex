import React, { useCallback, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { FileText, Folder, Video } from "lucide-react";
import type { Folder as FolderType } from "@/lib/api-types";
import { useMoveNote } from "@/hooks/use-notes";
import { useUpdateFolder } from "@/hooks/use-folders";
import { useUpdateVideo } from "@/hooks/use-videos";

// ============================================
// TYPES
// ============================================
export type DragItemType = "folder" | "note" | "video";

export interface DragItemData {
  type: DragItemType;
  id: string;
  label: string;
  parentId?: string | null;
}

// Context for child components to read active drag state
interface DndSidebarContextValue {
  activeItem: DragItemData | null;
  overId: string | null;
}

export const DndSidebarContext = React.createContext<DndSidebarContextValue>({
  activeItem: null,
  overId: null,
});

// ============================================
// HELPER: Check if target folder is a descendant of source folder
// ============================================
function isDescendant(
  folderId: string,
  potentialAncestorId: string,
  allFolders: FolderType[]
): boolean {
  let current = allFolders.find((f) => f.id === folderId);
  while (current) {
    if (current.parentId === potentialAncestorId) return true;
    current = allFolders.find((f) => f.id === current!.parentId);
  }
  return false;
}

// ============================================
// PROVIDER
// ============================================
interface DndSidebarProviderProps {
  children: React.ReactNode;
  allFolders: FolderType[];
}

export function DndSidebarProvider({
  children,
  allFolders,
}: DndSidebarProviderProps) {
  const [activeItem, setActiveItem] = useState<DragItemData | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Auto-expand timer ref
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mutations
  const { mutateAsync: moveFolder } = useUpdateFolder();
  const { mutateAsync: moveNote } = useMoveNote();
  const { mutateAsync: moveVideo } = useUpdateVideo();

  // Use pointer sensor with delay — long press ~250ms to start dragging
  // This lets quick clicks pass through for navigation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // ---- DRAG START ----
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItemData;
    if (data) {
      setActiveItem(data);
    }
  }, []);

  // ---- DRAG OVER ----
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over || !activeItem) {
        setOverId(null);
        if (expandTimerRef.current) {
          clearTimeout(expandTimerRef.current);
          expandTimerRef.current = null;
        }
        return;
      }

      const overData = over.data.current as { type: string; id: string } | undefined;
      if (!overData || (overData.type !== "folder" && overData.type !== "root-zone")) {
        setOverId(null);
        return;
      }

      const targetFolderId = overData.id;

      // Prevent dropping folder onto itself
      if (activeItem.type === "folder" && activeItem.id === targetFolderId) {
        setOverId(null);
        return;
      }

      // Prevent dropping folder into its own descendant
      if (
        activeItem.type === "folder" &&
        isDescendant(targetFolderId, activeItem.id, allFolders)
      ) {
        setOverId(null);
        return;
      }

      // Prevent dropping into current parent (no-op)
      if (activeItem.parentId === targetFolderId) {
        setOverId(null);
        return;
      }

      setOverId(targetFolderId);
    },
    [activeItem, allFolders]
  );

  // ---- DRAG END ----
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { over } = event;

      // Clear expand timer
      if (expandTimerRef.current) {
        clearTimeout(expandTimerRef.current);
        expandTimerRef.current = null;
      }

      if (!activeItem) {
        setActiveItem(null);
        setOverId(null);
        return;
      }

      try {
        // Dropped on a folder target
        if (over) {
          const overData = over.data.current as { type: string; id: string } | undefined;

          if (overData?.type === "folder") {
            const targetFolderId = overData.id;

            // Safety checks
            if (activeItem.type === "folder" && activeItem.id === targetFolderId) {
              return;
            }
            if (
              activeItem.type === "folder" &&
              isDescendant(targetFolderId, activeItem.id, allFolders)
            ) {
              toast.error("Cannot move a folder into its own subfolder");
              return;
            }
            if (activeItem.parentId === targetFolderId) {
              return; // Already in this folder
            }

            // Execute the move
            switch (activeItem.type) {
              case "note":
                await moveNote({
                  id: activeItem.id,
                  folderId: targetFolderId,
                });
                toast.success("Note moved successfully");
                break;
              case "folder":
                await moveFolder({
                  id: activeItem.id,
                  data: { parentId: targetFolderId }
                });
                toast.success("Folder moved successfully");
                break;
              case "video":
                await moveVideo({
                  id: activeItem.id,
                  data: { folderId: targetFolderId }
                });
                toast.success("Video moved successfully");
                break;
            }
          } else if (overData?.type === "root-zone") {
            if (activeItem.type === "folder" && activeItem.parentId) {
              await moveFolder({
                id: activeItem.id,
                data: { parentId: null }
              });
              toast.success("Folder moved to root");
            }
            if (activeItem.type === "note" && activeItem.parentId) {
              await moveNote({
                id: activeItem.id,
                folderId: null,
              });
              toast.success("Note moved to workspace root");
            }
            if (activeItem.type === "video" && activeItem.parentId) {
              await moveVideo({
                id: activeItem.id,
                data: { folderId: null },
              });
              toast.success("Video moved to workspace root");
            }
          }
        }
      } catch (error) {
        console.error("Move failed:", error);
        toast.error("Failed to move item");
      } finally {
        setActiveItem(null);
        setOverId(null);
      }
    },
    [activeItem, allFolders, moveNote, moveFolder]
  );

  // ---- DRAG CANCEL ----
  const handleDragCancel = useCallback(() => {
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    setActiveItem(null);
    setOverId(null);
  }, []);

  React.useEffect(() => {
    if (!activeItem) return;

    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "grabbing";

    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, [activeItem]);

  return (
    <DndSidebarContext.Provider value={{ activeItem, overId }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}

        {/* Drag overlay — floating ghost preview */}
        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm bg-background border shadow-lg max-w-[200px]">
              {activeItem.type === "folder" && (
                <Folder className="h-4 w-4 shrink-0 text-primary" />
              )}
              {activeItem.type === "note" && (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              {activeItem.type === "video" && (
                <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{activeItem.label}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DndSidebarContext.Provider>
  );
}
