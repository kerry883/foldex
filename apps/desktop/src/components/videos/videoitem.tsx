import { useTabNavigation } from "@/hooks/useTabNavigation";
import { Video as VideoIcon, Trash, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { useDeleteVideo } from "@/hooks/use-videos";
import { useGenerateVideo } from "@/hooks/useGenerateVideo";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import DeleteDialog from "../deletedialog";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";

interface VideoItemProps {
    videoId: string;
    title: string;
    folderId?: string;
    status?: string;
    isActive?: boolean;
}

const VideoItem = ({ title, folderId, videoId, status, isActive }: VideoItemProps) => {
    const { openInTab } = useTabNavigation();
    const { mutateAsync: deletevideo } = useDeleteVideo();
    const { handleRetry } = useGenerateVideo();
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        isDragging,
    } = useDraggable({
        id: `video-${videoId}`,
        data: {
            type: "video",
            id: videoId,
            label: title,
            parentId: folderId,
        },
    });

    const handleDelete = async () => {
        try {
            await deletevideo(videoId);
            toast.success("Video deleted successfully");
        } catch {
            toast.error("Failed to delete video");
        }
    };

    const isGenerating = status === "queued" || status === "generating";
    const isFailed = status === "failed";

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        ref={setNodeRef}
                        className={cn(
                            "group/item flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm  w-full overflow-hidden",
                            isActive ? "bg-primary/10 dark:bg-primary/10 font-medium text-foreground":"text-muted-foreground transition-colors hover:bg-accent/50",
                            isDragging && "cursor-grabbing opacity-40",
                            isGenerating && "opacity-70",
                        )}
                        onClick={() => {
                            if (!isGenerating) {
                                openInTab("video", videoId, folderId as string, title);
                            }
                        }}
                        {...listeners}
                        {...attributes}
                    >
                        {isGenerating ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                        ) : isFailed ? (
                            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                        ) : (
                            <VideoIcon className="h-4 w-4 shrink-0 " />
                        )}
                        <span className="flex-1 truncate min-w-0">{title || "Untitled Video"}</span>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuGroup>
                        {isFailed && (
                            <ContextMenuItem
                                onClick={() => handleRetry(videoId)}
                                className="cursor-pointer"
                            >
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Retry 
                            </ContextMenuItem>
                        )}
                        <ContextMenuItem
                            variant="destructive"
                            onClick={() => setOpenDeleteDialog(true)}
                            className="cursor-pointer"
                        >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                        </ContextMenuItem>
                    </ContextMenuGroup>
                </ContextMenuContent>
            </ContextMenu>
            <DeleteDialog
                open={openDeleteDialog}
                onOpenChange={setOpenDeleteDialog}
                title="Delete Video"
                description={`Are you sure you want to delete ${title}? This action cannot be undone.`}
                itemName={title}
                onConfirm={handleDelete}
            />
        </>
    );
};

export default VideoItem;
