import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { AlertCircle, Trash2 } from "lucide-react";
import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";

export const mermaidBlock = createReactBlockSpec(
  {
    type: "mermaid",
    propSchema: {
      ...defaultProps,
      mermaidCode: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => <MermaidBlockView {...props} />,
  },
);

function MermaidBlockView({ block, editor }: any) {
  const [isEditing, setIsEditing] = useState(!block.props.mermaidCode);
  const [draft, setDraft] = useState(() => block.props.mermaidCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);

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
    if (isEditing) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || !mermaidContainerRef.current || !block.props.mermaidCode) {
      return;
    }

    let isCancelled = false;

    const renderDiagram = async () => {
      setError(null);
      mermaidContainerRef.current!.innerHTML = "";

      try {
        await mermaid.parse(block.props.mermaidCode);
        const { svg } = await mermaid.render(
          `mermaid-${block.id}-${Date.now()}`,
          block.props.mermaidCode,
        );

        if (!isCancelled && mermaidContainerRef.current) {
          mermaidContainerRef.current.innerHTML = svg;
        }
      } catch (renderError: any) {
        if (!isCancelled) {
          setError(renderError?.message || "Invalid Mermaid syntax");
        }
      }
    };

    renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [block.id, block.props.mermaidCode, isEditing]);

  const saveDraft = () => {
    editor.updateBlock(block.id, {
      props: {
        mermaidCode: draft.trim(),
      },
    });

    if (draft.trim()) {
      setIsEditing(false);
    }
  };

  return (
    <div
      className="group relative my-4 w-full rounded-2xl bg-card px-6 py-6"
      contentEditable={false}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 h-8 w-8 cursor-pointer text-muted-foreground opacity-70 transition hover:opacity-100"
        onClick={() => editor.removeBlocks([block])}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {isEditing ? (
        <Textarea
          ref={textareaRef}
          value={draft}
          placeholder={"Enter Mermaid diagram...\nflowchart TD\n  A[Start] --> B[End]"}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={saveDraft}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              saveDraft();
            }
          }}
          className="min-h-[180px] resize-none border-0 bg-transparent px-3 py-4 font-mono text-sm shadow-none focus-visible:ring-0"
        />
      ) : (
        <button
          type="button"
          className="flex min-h-[180px] w-full items-center justify-center rounded-xl px-3 py-4 text-center"
          onClick={() => {
            setDraft(block.props.mermaidCode ?? "");
            setIsEditing(true);
          }}
        >
          {error ? (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : block.props.mermaidCode ? (
            <div
              ref={mermaidContainerRef}
              className="w-full overflow-auto scrollbar-hidden [&_svg]:mx-auto [&_svg]:max-w-full"
            />
          ) : (
            <span className="font-mono text-sm text-muted-foreground">
              Enter Mermaid diagram...
            </span>
          )}
        </button>
      )}
    </div>
  );
}