import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { useCanvasStore } from "@/stores/canvasStore";
import { CodePlayground } from "./codeplayground";
import { MermaidDiagram } from "./mermaid";
import {  AiVideoPanel, VideoPanel } from "./canvas";
import NotesPanel from "./notespanel";

const CanvasModal = () => {
  const { activeView, setCanvasOpen, isCanvasOpen } = useCanvasStore();
  return (
    <Dialog open={isCanvasOpen} onOpenChange={setCanvasOpen}>
      <DialogContent className=" max-h-[calc(100vh-2rem)]   md:max-w-[800px] lg:max-w-[900px] flex flex-col h-full overflow-y-auto scrollbar-hidden">
        <DialogHeader>
          <DialogTitle>Canvas</DialogTitle>
        </DialogHeader>
        <div className="flex h-full">
          {activeView === "note" && <NotesPanel />}

          {activeView === "ytvideo" && <VideoPanel />}  
          {activeView === "code" && <CodePlayground />}
          {activeView === "aivideo" && <AiVideoPanel />}
          {activeView === "mermaid" && <MermaidDiagram />}

          {activeView === "idle" && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select an item to view in the Canvas
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CanvasModal;