import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { AlertCircle, ArrowUp, Loader2, Video } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Input } from "@workspace/ui/components/input";
import { VideoPlayer } from "../videos/videoplayer";
import { useGenerateVideo } from "@/hooks/useGenerateVideo";
import { useVideo } from "@/hooks/use-videos";

import { useApiKeys } from "@/hooks/use-settings";
import { getAvailableModels } from "@/lib/providers";
import { useNoteStore } from "@/stores/notestore";


export const Videoblock = createReactBlockSpec(
  {
    type: "aivideo",
    propSchema: {
      videoId: { default: "" },
      status: { default: "initial" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { folderId } = useNoteStore();
      const [promptInput, setPromptInput] = useState("");
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [isOpen, setIsOpen] = useState(false);
      const { generateVideo,generateVideoAsync } = useGenerateVideo();
      const {data:video} = useVideo(props.block.props.videoId);
      const { data: apiKeys } = useApiKeys();
      const configuredProviders = useMemo(
          () => (apiKeys ?? []).map(k => k.provider),
          [apiKeys]
      );
      const availableModels = useMemo(
          () => getAvailableModels(configuredProviders),
          [configuredProviders]
       );

     const selectedModel = (availableModels.length > 0 ? availableModels[0].model.id : "");
      //popover effect
      useEffect(() => {
        if (props.block.props.status === "initial") {
          const timer = setTimeout(() => setIsOpen(true), 10);
          return () => clearTimeout(timer);
        }
      }, []);
      //handle generate
      const handlegenerate = async () => {
        if (!promptInput.trim()) return;
        setIsSubmitting(true);
        if (typeof window !== "undefined" && !localStorage.getItem("foldex_user_id")) {
            toast.info("You need to sign in to use to generate a video.");
            return;
        }
        
        if (!selectedModel) {
            toast.error("Please configure an AI provider in Settings to use this feature.");
            setIsSubmitting(false);
            return;
        }

        
        try {
          const allBlocks = props.editor.document;
          const noteContent = allBlocks
            .map((block: any) => {
              if (Array.isArray(block.content)) {
                return block.content.map((c: any) => c.text || "").join("");
              }
              return "";
            })
            .filter((text: string) => text.trim() !== "")
            .join("\n");
          const id = await generateVideoAsync({
            folderId: folderId ?? undefined,
            prompt: promptInput,
            fileContext: noteContent,
            model:selectedModel
          }); 
          props.editor.updateBlock(props.block, {
            props: {
              videoId: id.videoId,
              status: "generating",
            },
          });

          setIsOpen(false);
        } catch (error) {
          toast.error("Failed to generate video");
          console.error(error);
        } finally {
          setIsSubmitting(false);
        }
      };
      const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open && !isSubmitting && props.block.props.status === "initial") {
          setTimeout(() => {
            props.editor.removeBlocks([props.block]);
          }, 100);
        }
      };
      if (props.block.props.status === "initial") {
        return (
          <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <div className="h-12 w-full select-none" />
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-[900px] max-w-[90vw] border-none bg-transparent shadow-none"
              align="start"
              side="top"
              sideOffset={-44}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="flex items-center p-1 rounded-xl border bg-background shadow-lg ring-1 ring-foreground/5">
                <div className="pl-3 pr-2 text-muted-foreground">
                  <Video className="w-5 h-5" />
                </div>
                <Input
                  placeholder="Describe the  video you want to generate..."
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlegenerate()}
                  className="flex-grow border-none shadow-none bg-transparent focus-visible:ring-0 text-base h-10 px-2"
                  autoFocus
                  disabled={isSubmitting}
                />
                <Button
                  size="icon"
                  onClick={handlegenerate}
                  disabled={!promptInput || isSubmitting}
                  className="h-9 w-9 rounded-lg transition-all ml-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        );
      }

      // === RENDER STATE 2: GENERATING (Loading Card) ===
      // We show this if block status is generating OR if Convex says it's generating
      const isGenerating = video?.status === "generating";

      if (isGenerating) {
        return (
          <div className="my-4 w-full">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gradient-to-br from-muted via-muted/50 to-muted border border-border/50 shadow-lg">
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                {/* Spinner */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-muted-foreground/20 border-t-primary animate-spin" />
                </div>

                {/* Status text */}
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground">
                    Creating your video...
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    This may take a few moments. Your video will appear here
                    when ready.
                  </p>
                </div>

                {/* Progress dots */}
                <div className="flex gap-2 mt-2">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                </div>
              </div>

              {/* Bottom bar with shimmer */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/20 overflow-hidden">
                <div className="h-full bg-primary/50 animate-progress" />
              </div>
            </div>
          </div>
        );
      }

      // === RENDER STATE 3: FAILED ===
      if (video?.status === "failed") {
        return (
          <Card
            className="w-full my-4 p-4 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">Video generation failed.</p>
              {props.editor.isEditable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto border-red-200 hover:bg-red-100"
                  onClick={() => props.editor.removeBlocks([props.block])}
                >
                  Remove
                </Button>
              )}
            </div>
          </Card>
        );
      }

      // === RENDER STATE 4: READY (Custom Video Player) ===
      if (video?.status === "ready" && video.url) {
        return (
          <div className="my-4 w-full" onMouseDown={(e) => e.stopPropagation()}>
            <VideoPlayer
              src={video.url}
              title={video.title}
              poster={video.thumbnail}
              className="w-full shadow-md border"
            />
          </div>
        );
      }

      return null;
    },
  }
);
