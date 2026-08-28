import { createReactInlineContentSpec } from "@blocknote/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useRef, useEffect } from "react";

export const MathInline = createReactInlineContentSpec(
  {
    type: "math",
    propSchema: {
      latex: { default: "x" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const containerRef = useRef<HTMLSpanElement>(null);

      useEffect(() => {
        if (containerRef.current && props.inlineContent.props.latex) {
          try {
            // Clear previous content
            containerRef.current.innerHTML = "";

            katex.render(
              props.inlineContent.props.latex,
              containerRef.current,
              {
                throwOnError: false,
                displayMode: false,
                output: "html",
              }
            );
          } catch (e) {
            console.error("KaTeX render error:", e);
            if (containerRef.current) {
              containerRef.current.innerText = props.inlineContent.props.latex;
              containerRef.current.style.color = "red";
            }
          }
        }
      }, [props.inlineContent.props.latex]);

      return (
        <span
          ref={containerRef}
          contentEditable={false}
          className="math-inline mx-0.5 px-1 py-0.5 rounded hover:bg-muted/50 cursor-pointer select-none inline-block align-baseline"
          title={`LaTeX: ${props.inlineContent.props.latex}`}
          // Prevent default to avoid editing issues
          onMouseDown={(e) => e.preventDefault()}
        />
      );
    },
  }
);