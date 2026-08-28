import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";

export const latexBlock = createReactBlockSpec(
  {
    type: "latex",
    propSchema: {
      ...defaultProps,
      latex: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => <LatexBlockView {...props} />,
  },
);

function LatexBlockView({ block, editor }: any) {
  const [isEditing, setIsEditing] = useState(!block.props.latex);
  const [draft, setDraft] = useState(() => block.props.latex ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  const renderedLatex = useMemo(() => {
    if (!block.props.latex) {
      return "";
    }

    try {
      return katex.renderToString(block.props.latex, {
        throwOnError: false,
        displayMode: true,
        output: "html",
      });
    } catch {
      return block.props.latex;
    }
  }, [block.props.latex]);

  const saveDraft = () => {
    editor.updateBlock(block.id, {
      props: {
        latex: draft.trim(),
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
        className="absolute right-4 top-4 h-8 w-8 text-muted-foreground opacity-70 transition hover:opacity-100 cursor-pointer"
        onClick={() => editor.removeBlocks([block])}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {isEditing ? (
        <Textarea
          ref={textareaRef}
          value={draft}
          placeholder="Enter LaTeX expression..."
          onChange={(event) => setDraft(event.target.value)}
          onBlur={saveDraft}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              saveDraft();
            }
          }}
          className="min-h-[140px] resize-none border-0 bg-transparent px-3 py-4 font-mono text-xl shadow-none focus-visible:ring-0"
        />
      ) : (
        <button
          type="button"
          className="flex min-h-[140px] w-full items-center justify-center rounded-xl px-3 py-4 text-center"
          onClick={() => {
            setDraft(block.props.latex ?? "");
            setIsEditing(true);
          }}
        >
          {renderedLatex ? (
            <div
              className="latex-block-render text-3xl text-foreground"
              dangerouslySetInnerHTML={{ __html: renderedLatex }}
            />
          ) : (
            <span className="font-mono text-xl text-muted-foreground">
              Enter LaTeX expression...
            </span>
          )}
        </button>
      )}
    </div>
  );
}