import { Video as VideoIcon, Trash, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import type { Video } from "@/lib/api-types";
import { formatRelativeDate } from "@/lib/timegroup";
import { useTabNavigation } from "@/hooks/useTabNavigation";
import { useDeleteVideo } from "@/hooks/use-videos";
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
import DeleteDialog from "../deletedialog";
import { useGenerateVideo } from "@/hooks/useGenerateVideo";

interface VideoCardHomeProps {
    video: Video;
    view: "grid" | "list";
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
}

export function VideoCardHome({ video, view, isSelected, onToggleSelect }: VideoCardHomeProps) {
    const { openInTab } = useTabNavigation();
    const { mutateAsync: deleteVideo } = useDeleteVideo();
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const {handleRetry}=useGenerateVideo();

    const isGenerating = video.status === "queued" || video.status === "generating";
    const isFailed = video.status === "failed";

    const handleDelete = async () => {
        try {
            await deleteVideo(video.id);
            toast.success("Video deleted");
        } catch {
            toast.error("Failed to delete video");
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("[data-checkbox]")) return;
        if (!isGenerating) {
            openInTab("video", video.id, video.folderId || undefined, video.title || "Video");
        }
    };

    const contextMenuContent = (
        <ContextMenuContent>
            <ContextMenuGroup>
                 {video.status === "failed" && (
                            <ContextMenuItem
                                onClick={() => handleRetry(video.id)}
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
                            className={cn(
                                "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-accent/50",
                                isSelected && "bg-primary/5",
                                isGenerating && "opacity-60",
                            )}
                            onClick={handleClick}
                        >
                            {/* Checkbox */}
                            <div
                                data-checkbox
                                className="shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSelect?.(video.id);
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
                                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                            </div>

                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
                            ) : isFailed ? (
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                            ) : (
                                <VideoIcon className="h-4 w-4 text-purple-500 shrink-0" />
                            )}
                            <span className="flex-1 text-sm font-medium truncate">{video.title || "Untitled Video"}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden md:block">
                                {isGenerating ? "Generating..." : isFailed ? "Failed" : video.description || ""}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                                {formatRelativeDate(video.updatedAt)}
                            </span>
                        </div>
                    </ContextMenuTrigger>
                    {contextMenuContent}
                </ContextMenu>
                <DeleteDialog
                    open={openDeleteDialog}
                    onOpenChange={setOpenDeleteDialog}
                    title="Delete Video"
                    description="Are you sure you want to delete this video? This action is permanent and cannot be undone."
                    itemName={video.title || "Untitled Video"}
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
                        className={cn(
                            "group cursor-pointer flex flex-col gap-2",
                            isGenerating && "opacity-60",
                        )}
                        onClick={handleClick}
                    >
                        <div className={cn(
                            "relative bg-muted/40 group-hover:bg-muted/60 transition-colors rounded-2xl aspect-[4/5] flex items-center justify-center border border-transparent group-hover:border-border/50",
                            isSelected && "border-primary/50 bg-primary/5",
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
                                    onToggleSelect?.(video.id);
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
                                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                            </div>

                            {/* Status badge */}
                            {(isGenerating || isFailed) && (
                                <div className="absolute top-2 right-2 z-10">
                                    {isGenerating ? (
                                        <div className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Generating
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 bg-destructive/10 text-destructive text-[10px] font-medium px-2 py-0.5 rounded-full">
                                            <AlertCircle className="h-3 w-3" />
                                            Failed
                                        </div>
                                    )}
                                </div>
                            )}

                            <VideoIcon
                                className="w-16 h-16 drop-shadow-sm text-purple-500"
                            />
                        </div>

                        {/* Meta below */}
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2 truncate pr-2">
                                <VideoIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className="text-sm font-medium truncate text-foreground">{video.title || "Untitled Video"}</span>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{formatRelativeDate(video.updatedAt)}</span>
                        </div>
                    </div>
                </ContextMenuTrigger>
                {contextMenuContent}
            </ContextMenu>
            <DeleteDialog
                open={openDeleteDialog}
                onOpenChange={setOpenDeleteDialog}
                title="Delete Video"
                description="Are you sure you want to delete this video? This action is permanent and cannot be undone."
                itemName={video.title || "Untitled Video"}
                onConfirm={handleDelete}
            />
        </>
    );
}
