import React, { useState, useEffect } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { defaultProps } from "@blocknote/core";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Video, ArrowUp, Link as LinkIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { toast } from "sonner";

/**
 * Helper function to parse a YouTube URL and extract the video ID.
 */
function getYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// 1. Define the "blueprint"
export const createYoutubeVideo = createReactBlockSpec(
  {
    type: "youtubeVideo",
    propSchema: {
      ...defaultProps,
      videoUrl: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => <YoutubeVideoBlock {...props} />,
  }
);

// 2. The Component
function YoutubeVideoBlock({ block, editor }: any) {
  const [urlInput, setUrlInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Fix: Open the popover immediately after mount (avoids flushSync error)
  useEffect(() => {
    if (!block.props.videoUrl) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [block.props.videoUrl]);

  const handleSubmit = () => {
    const videoId = getYoutubeVideoId(urlInput);

    if (!videoId) {
      // Simple validation: Shake or alert (using alert for simplicity here)
      toast.error("Invalid YouTube URL. Please check the link.");
      return;
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    // Update block props - this triggers re-render to show the video
    editor.updateBlock(block.id, {
      props: {
        videoUrl: embedUrl,
      },
    });
    setIsOpen(false);
  };

  // Logic: If user clicks away (closes popover) and hasn't saved a URL, remove the block
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && !block.props.videoUrl) {
      // Small delay to prevent flickering if switching focus
      setTimeout(() => {
        editor.removeBlocks([block]);
      }, 100);
    }
  };

  // STATE 1: VIEW MODE (Video Player)
  if (block.props.videoUrl) {
    return (
      <div
        className="rounded-xl overflow-hidden my-4 ring-1 ring-border shadow-sm"
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
        }}
      >
        <iframe
          style={{ width: "100%", height: "100%" }}
          src={block.props.videoUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // STATE 2: INPUT MODE (Popover)
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      {/* Anchor: Takes up a little space in the editor to show where the block is */}
      <PopoverTrigger asChild>
        <div className="h-12 w-full flex items-center justify-center gap-2 text-muted-foreground bg-muted/10 rounded-md border border-dashed border-transparent hover:border-muted transition-all cursor-pointer select-none opacity-50">
          <Video className="w-4 h-4" /> <span>Add Video...</span>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[900px] max-w-[90vw] border-none bg-transparent shadow-none"
        align="start"
        side="top"
        sideOffset={-44} // Overlaps the trigger perfectly
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center p-1.5 rounded-xl border bg-background shadow-xl ring-1 ring-foreground/5">
          {/* Icon */}
          <div className="flex items-center justify-center h-8 w-8 ml-1 rounded-md bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <Video className="h-4 w-4" />
          </div>

          <Input
            placeholder="Paste YouTube URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-grow border-none shadow-none bg-transparent focus-visible:ring-0 text-base h-9 px-3"
            autoFocus
          />

          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!urlInput}
              className="h-8 w-8 rounded-lg transition-all"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}