import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  CopyIcon,
  DownloadIcon,
  ShareIcon,
  TerminalSquareIcon,
  X,
} from "lucide-react";
import { toast } from "sonner"; // Assuming you have sonner or use your own toast
import { useCanvasStore } from "@/stores/canvasStore";
import type { BundledLanguage } from "shiki";

export const CodePlayground = () => {
  const { activeCodeSnippet, setCanvasOpen } = useCanvasStore();

  if (!activeCodeSnippet) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCodeSnippet.code);
    toast.success("Code copied to clipboard");
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <Artifact className="h-full border-none shadow-none">
        <ArtifactHeader className="border-b px-4 py-3">
          <div className="flex flex-col gap-1">
            <ArtifactTitle className="flex items-center gap-2 text-lg">
              <TerminalSquareIcon className="h-5 w-5 text-blue-500" />
              {activeCodeSnippet.title}
            </ArtifactTitle>
            {activeCodeSnippet.description && (
              <ArtifactDescription>
                {activeCodeSnippet.description}
              </ArtifactDescription>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ArtifactActions>
              {/* Future Idea: Connect 'Run' to a Pyodide instance or Piston API 
                 For now, we stick to Copy/Download/Share
              */}
              <ArtifactAction
                icon={CopyIcon}
                label="Copy"
                onClick={handleCopy}
                tooltip="Copy to clipboard"
              />
              <ArtifactAction
                icon={DownloadIcon}
                label="Download"
                onClick={() => console.log("Download Logic Here")}
                tooltip="Download file"
              />
              <ArtifactAction
                icon={X}
                label="Close"
                onClick={() => setCanvasOpen(false)}
                tooltip="Close code snippet"
              />
            </ArtifactActions>
          </div>
        </ArtifactHeader>

        <ArtifactContent className="p-0 flex-1 overflow-y-auto">
          {/* Note: Ensure the parent div has a defined height 
                so the CodeBlock scrolls correctly 
            */}
          <div className="flex-1  overflow-y-auto">
            <CodeBlock
              className="border-none h-full"
              code={activeCodeSnippet.code}
              language={activeCodeSnippet.language as BundledLanguage}
              showLineNumbers
            />
          </div>
        </ArtifactContent>
      </Artifact>
    </div>
  );
};