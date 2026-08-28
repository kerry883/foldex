import { useCanvasStore } from "@/stores/canvasStore";
import { X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useSidebar } from "@workspace/ui/components/sidebar";
import { useEffect } from "react";
import { CodePlayground } from "./codeplayground";
import { MermaidDiagram } from "./mermaid";
import NotesPanel from "./notespanel";
import { VideoPlayer } from "../videos/videoplayer";

export default function Canvas() {
  const { activeView, isCanvasOpen } = useCanvasStore();
  const { toggleSidebar, setOpen } = useSidebar();
  useEffect(() => {
    if (isCanvasOpen === true) {
      setOpen(false);
    }
  }, []);
  return (
    <div className="h-full w-full">
      {activeView === "note" && <NotesPanel />}

      {activeView === "ytvideo" && <VideoPanel />}
      {activeView === "code" && <CodePlayground />}
      {activeView === "mermaid" && <MermaidDiagram />}
      {activeView === "aivideo" && <AiVideoPanel />}

      {activeView === "idle" && (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Select an item to view in the Canvas
        </div>
      )}
    </div>
  );
}

export const VideoPanel = () => {
  const { activeYtVideo, setCanvasOpen } = useCanvasStore();
  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 bg-accent flex items-center justify-between">
        <p>{activeYtVideo?.title}</p>
        <Button onClick={() => setCanvasOpen(false)}>
          <X />
        </Button>
      </div>
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${activeYtVideo?.videoId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="border-0"
      />
    </div>
  );
};
export const AiVideoPanel = () => {
  const { activeAiVideo, setCanvasOpen } = useCanvasStore();
  if (!activeAiVideo) {
    return null;
  }
  return (
    <div className=" w-full h-full flex flex-col">
      <div className="p-4 bg-accent flex flex-col ">
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-semibold">{activeAiVideo?.title}</p>
          <Button onClick={() => setCanvasOpen(false)}>
            <X />
          </Button>
        </div>
        <p className="text-xs truncate text-muted-foreground">
          {activeAiVideo?.description}
        </p>
      </div>
      <VideoPlayer
        src={activeAiVideo?.src}
        title={activeAiVideo?.title}
        poster={activeAiVideo?.poster}
        className="w-full shadow-md border h-full"
      />
    </div>
  );
};

