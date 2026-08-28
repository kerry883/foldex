import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { useCanvasStore } from "@/stores/canvasStore";
import Canvas from "@/components/aicomponents/canvas";
import { useEffect, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import AiChatComponent from "@/components/aicomponents/aichat";

interface ChatClientProps {
  chatId: string;
}

export default function ChatClient({ chatId }: ChatClientProps) {
  const { isCanvasOpen } = useCanvasStore();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile(); 
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  const defaultChatSize = isCanvasOpen ? 40 : 100;

  return (
    <div className="h-full w-full relative">
      <ResizablePanelGroup
        orientation="horizontal"
        className="h-full w-full bg-muted/10"
      >
        <ResizablePanel defaultSize={defaultChatSize} minSize={40}>
          <div className="h-full overflow-y-auto">
            <AiChatComponent chatId={chatId} />
          </div>
        </ResizablePanel>

        {!isMobile && isCanvasOpen && (
          <>
            <ResizableHandle
              withHandle={false}
              className="bg-transparent w-2"
            />

            <ResizablePanel
              defaultSize={60}
              minSize={30}
              className="hidden lg:block"
            >
              <div className="h-full p-3 pl-0">
                <div className="h-full w-full bg-background rounded-3xl border shadow-sm overflow-hidden flex flex-col">
                  <Canvas />
                </div>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-muted/10 flex flex-col lg:hidden transition-transform duration-300 ease-in-out",
          isCanvasOpen && isMobile ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full w-full bg-background rounded-2xl border shadow-sm overflow-hidden flex flex-col">
            <Canvas />
          </div>
        </div>
      </div>
    </div>
  );
}
