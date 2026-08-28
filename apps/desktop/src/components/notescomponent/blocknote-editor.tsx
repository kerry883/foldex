import {
  BlockNoteEditor,
  BlockNoteSchema,
  createCodeBlockSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
  type PartialBlock,
} from "@blocknote/core";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  type DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  type SuggestionMenuProps,
  useCreateBlockNote,
} from "@blocknote/react";
import { useTheme } from "next-themes";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import { codeBlockOptions } from "@blocknote/code-block";
import {
  BrainCircuit,
  GitBranch,
  Sigma,
  NotebookText,
  Paintbrush,
  Video,
} from "lucide-react";
import { Fragment, useEffect, useRef } from "react";
import { createYoutubeVideo } from "./youtubeBlock";
import { QuizBlock } from "./quizBlock";
import { mermaidBlock } from "./mermaidBlock";
import { latexBlock } from "./latexBlock";
import { flashcardblock } from "./flashcardBlock";
import { MathInline } from "./Mathblock";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

import type { BlockNoteContent } from "@/lib/api-types";
import { Videoblock } from "./aivideoblock";

interface BlocknoteEditorProps {
  initialContent?: BlockNoteContent;
  onChangeContent: (value: BlockNoteContent) => void;
  editable?: boolean;
}
const customSchema = BlockNoteSchema.create({
  blockSpecs: {
    // Include all default blocks
    ...defaultBlockSpecs,
    // Add code block with syntax highlighting
    codeBlock: createCodeBlockSpec(codeBlockOptions),
    // Add our custom blocks
    youtubeVideo: createYoutubeVideo(),
    quiz: QuizBlock(),
    mermaid: mermaidBlock(),
    flashcard: flashcardblock(),
    latex: latexBlock(),
    aivideo: Videoblock(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    math: MathInline,
  },
});
// Define the slash menu item for the YouTube block
const insertYoutubeVideoItem = (
  editor: BlockNoteEditor<typeof customSchema.blockSchema>,
): DefaultReactSuggestionItem => ({
  title: "YouTube Video",
  onItemClick: () => {
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "youtubeVideo",
    });
  },
  aliases: ["youtube", "video", "embed", "yt"],
  group: "other",
  icon: <Video size={18} />,
  subtext: "Embed a YouTube video",
});
const insertQuizItem = (
  editor: BlockNoteEditor<typeof customSchema.blockSchema>,
): DefaultReactSuggestionItem => ({
  title: "Generate Quiz",
  onItemClick: () => {
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "quiz",
    });
  },
  aliases: ["quiz", "flashcard", "test", "ai"],
  group: "AI Tools",
  icon: <NotebookText size={18} />,
  subtext: "Generate an interactive practice problem",
});


const insertFlashcardItem = (
  editor: BlockNoteEditor<typeof customSchema.blockSchema>,
): DefaultReactSuggestionItem => ({
  title: "Generate Flashcard",
  onItemClick: () => {
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "flashcard",
    });
  },
  aliases: ["ai", "flashcard", "aiFlashcard", "test", "quiz"],
  group: "AI Tools",
  icon: <BrainCircuit size={18} />,
  subtext: "Generate an interactive flashcard",
});

const insertLatexItem = (
  editor: BlockNoteEditor<typeof customSchema.blockSchema>,
): DefaultReactSuggestionItem => ({
  title: "LaTeX Formula",
  onItemClick: () => {
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "latex",
    });
  },
  aliases: ["latex", "math", "equation", "formula", "katex"],
  group: "other",
  icon: <Sigma size={18} />,
  subtext: "Insert a rendered LaTeX math block",
});

const insertMermaidItem = (
  editor: BlockNoteEditor<typeof customSchema.blockSchema>,
): DefaultReactSuggestionItem => ({
  title: "Mermaid Diagram",
  onItemClick: () => {
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "mermaid",
    });
  },
  aliases: ["mermaid", "diagram", "flowchart", "sequence", "graph"],
  group: "other",
  icon: <GitBranch size={18} />,
  subtext: "Insert a Mermaid diagram block",
});

const insertAiVideoItem = (
  editor: BlockNoteEditor<typeof customSchema.blockSchema>,
): DefaultReactSuggestionItem => ({
  title: "Generate Video",
  onItemClick: () => {
    insertOrUpdateBlockForSlashMenu(editor, {
      type: "aivideo",
    });
  },
  aliases: ["ai", "video", "embed", "aiVideo"],
  group: "AI Tools",
  icon: <Video size={18} />,
  subtext: "Generate a video using AI",
});

const getCustomSlashMenuItems = (
  editor: BlockNoteEditor<typeof customSchema.blockSchema>,
): DefaultReactSuggestionItem[] => {
  const filteredDefaultItems = getDefaultReactSlashMenuItems(editor).filter(
    (item) => !["audio", "file"].includes(item.title.toLowerCase()),
  );

  return [
    insertAiVideoItem(editor),
    insertQuizItem(editor),
    insertFlashcardItem(editor),
    ...filteredDefaultItems,
    insertYoutubeVideoItem(editor),
    insertMermaidItem(editor),
    insertLatexItem(editor),
  ];
};
const BlocknoteEditor = ({
  initialContent,
  onChangeContent,
  editable = true,
}: BlocknoteEditorProps) => {
  const { resolvedTheme } = useTheme();


  /**
   * This function handles file uploads for BlockNote.
   * It's used by the default 'Image' and 'File' (video/etc) blocks.
   */
  const handleUpload = async (file: File)=> {
    
  };
  // Create editor with proper typing
  const editor = useCreateBlockNote({
    initialContent: (initialContent && Array.isArray(initialContent) && initialContent.length > 0) 
      ? (initialContent as PartialBlock[]) 
      : undefined,
    schema: customSchema,
  });

  useEffect(() => {
    if (!editor || !initialContent || !Array.isArray(initialContent)) return;

    // Fast check: serialize both correctly OR just check if the user is typing
    // If the user is actively typing, don't overwrite the editor
    const isFocused = editor.domElement?.contains(document.activeElement);
    if (isFocused) {
      return;
    }
    
    // Convert current document back to array to compare deeply, or just compare stringified versions
    // as a quick hack to avoid infinite update loops
    const currentEditorContent = JSON.stringify(editor.document);
    const newContentStr = JSON.stringify(initialContent);

    if (currentEditorContent !== newContentStr) {
        const timeoutId = setTimeout(() => {
          editor.replaceBlocks(editor.document, initialContent as PartialBlock[]);
        }, 0);

        return () => clearTimeout(timeoutId);
    }
  }, [initialContent, editor]);
  const checkForMath = (
    editor: BlockNoteEditor<
      typeof customSchema.blockSchema,
      typeof customSchema.inlineContentSchema
    >,
  ) => {
    try {
      // Get the text cursor position
      const textCursorPosition = editor.getTextCursorPosition();
      if (!textCursorPosition) {
        console.log("No text cursor position");
        return;
      }

      const block = textCursorPosition.block;

      // Safety check: ensure block has content array
      if (
        !block.content ||
        !Array.isArray(block.content) ||
        block.content.length === 0
      ) {
        console.log("No content in block");
        return;
      }

      // Convert the entire block content to a string to check for pattern
      let fullText = "";
      const contentNodes = [...block.content];

      // Build the full text from all text nodes
      for (const node of contentNodes) {
        if (node.type === "text") {
          fullText += node.text;
        }
      }

      console.log("Full text:", fullText);

      // Check if there's a complete $...$ pattern
      const match = fullText.match(/\$([^$]+)\$$/);

      if (match) {
        console.log("Math pattern found:", match[0]);
        const [fullMatch, latexContent] = match;
        const textBefore = fullText.slice(0, -fullMatch.length);

        console.log("Text before:", textBefore);
        console.log("LaTeX content:", latexContent);

        // Build new content array
        const newContent: any[] = [];

        // Add text before the math (if any)
        if (textBefore) {
          newContent.push({
            type: "text",
            text: textBefore,
            styles: {},
          });
        }

        // Add the Math Inline Node
        newContent.push({
          type: "math",
          props: {
            latex: latexContent.trim(),
          },
        });

        // Add a trailing space
        newContent.push({
          type: "text",
          text: " ",
          styles: {},
        });

        console.log("Updating block with new content:", newContent);

        // Update the block
        editor.updateBlock(block, {
          content: newContent,
        });

        // Move cursor after a brief delay
        setTimeout(() => {
          try {
            editor.setTextCursorPosition(block, "end");
          } catch (e) {
            console.error("Error setting cursor:", e);
          }
        }, 10);
      } else {
        console.log("No math pattern match");
      }
    } catch (error) {
      console.error("Error in checkForMath:", error);
    }
  };

  // Handle content changes
  const handleChange = () => {
    checkForMath(editor);
    try {
      const blocks = editor.document;
      // Pass the actual array of blocks out, not a string
      onChangeContent(blocks as unknown as BlockNoteContent);
    } catch (error) {
      console.error("Failed to propagate content:", error);
    }
  };

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      editable={editable}
      onChange={handleChange}
      slashMenu={false}
       spellCheck={false}
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          // Filter items based on user's search query
          filterSuggestionItems(getCustomSlashMenuItems(editor as any), query)
        }
        suggestionMenuComponent={CustomSlashMenu}
      />
    </BlockNoteView>
  );
};

export default BlocknoteEditor;

function CustomSlashMenu(
  props: SuggestionMenuProps<DefaultReactSuggestionItem>,
) {
  let currentGroup: string | null = null;

  // 1. Create a Ref to track the currently selected item in the DOM
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // 2. Add an Effect that runs whenever the selectedIndex changes
  useEffect(() => {
    if (selectedItemRef.current) {
      // This command forces the browser to scroll the container
      // until the referenced element is visible.
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // Ensures it doesn't jump too much
      });
    }
  }, [props.selectedIndex]);

  return (
    <div className="bg-popover text-popover-foreground rounded-lg shadow-md w-72 overflow-hidden border overflow-y-auto scrollbar-hidden">
      <ScrollArea className="max-h-72">
        <div className="p-1">
          {props.items.length > 0 ? (
            props.items.map((item, index) => {
              const showHeader = item.group !== currentGroup;
              currentGroup = item.group!;
              const isSelected = props.selectedIndex === index;

              return (
                <Fragment key={index}>
                  {showHeader && (
                    <div className="text-xs font-semibold text-muted-foreground uppercase pt-2 pb-1 px-2">
                      {item.group}
                    </div>
                  )}

                  <div
                    // 3. Attach the Ref ONLY to the selected item
                    ref={isSelected ? selectedItemRef : null}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                    onClick={() => {
                      props.onItemClick?.(item);
                    }}
                  >
                    <div className="text-muted-foreground">{item.icon}</div>
                    <span className="font-medium">{item.title}</span>
                  </div>
                </Fragment>
              );
            })
          ) : (
            <div className="p-2 text-sm text-muted-foreground">No results</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}