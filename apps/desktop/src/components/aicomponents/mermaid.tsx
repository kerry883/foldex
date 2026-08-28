import { useCanvasStore } from "@/stores/canvasStore";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Button } from "@workspace/ui/components/button";
import {
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
} from "lucide-react";

export function MermaidDiagram() {
  const { activeMermaid, setCanvasOpen } = useCanvasStore();
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: "dark",
      securityLevel: "loose",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    });
  }, []);

  useEffect(() => {
    if (!activeMermaid?.diagram || !mermaidRef.current) return;

    const renderDiagram = async () => {
      try {
        setError(null);
        mermaidRef.current!.innerHTML = "";
        try {
          await mermaid.parse(activeMermaid.diagram);
        } catch (e) {
          throw new Error("Syntax error");
        }
        const { svg } = await mermaid.render(
          `mermaid-${Date.now()}`,
          activeMermaid?.diagram
        );

        mermaidRef.current!.innerHTML = svg;
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError("Failed to render diagram. Check syntax.");
      }
    };

    renderDiagram();
  }, [activeMermaid?.diagram]);

  const handleCopy = async () => {
    if (!activeMermaid?.diagram) return;
    await navigator.clipboard.writeText(activeMermaid.diagram);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!mermaidRef.current) return;

    const svg = mermaidRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeMermaid?.title || "diagram"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className="h-full w-full flex flex-col bg-card">
      <div className="border-b border-border px-4 py-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">
            {activeMermaid?.title.slice(0, 20) + "..." || "Diagram"}
          </h3>
          {activeMermaid?.description && (
            <p className="text-xs text-muted-foreground mt-1 ">
              {activeMermaid.description.slice(0, 50) + "..."}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 ">
            <Button variant="ghost" className="cursor-pointer" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-12 text-center hidden md:inline">
              {zoom}%
            </span>
            <Button variant="ghost" className="cursor-pointer" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetZoom}
              className=" cursor-pointer"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="ghost" className="cursor-pointer" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            <span className="hidden md:inline">
              {" "}
              {copied ? "Copied!" : "Copy"}
            </span>
          </Button>

          <Button variant="ghost" className="cursor-pointer" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden md:inline"> Export SVG</span>
          </Button>
          <Button
            variant="ghost" className="cursor-pointer"
            size="sm"
            onClick={() => setCanvasOpen(false)}
          >
            <X className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-hidden p-8 flex items-center justify-center">
        {error ? (
          <div className="flex flex-col items-center justify-center text-destructive gap-2">
            <div className="text-lg font-semibold">Syntax Error</div>
            <div className="text-sm text-muted-foreground max-w-md text-center">
              {error}
            </div>
          </div>
        ) : (
          <div
            ref={mermaidRef}
            className="transition-transform"
            style={{ transform: `scale(${zoom / 100})` }}
          />
        )}
      </div>
    </div>
  );
}