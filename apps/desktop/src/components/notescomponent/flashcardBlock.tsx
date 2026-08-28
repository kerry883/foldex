import { createReactBlockSpec } from "@blocknote/react";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Trash2,
  RotateCcw,
  Lightbulb,
} from "lucide-react";

import { toast } from "sonner";
import { getApiKeysMeta } from "@/lib/services/localapikeys";
import { generateFlashcardsAction } from "@/lib/ai/unified-ai";

export const flashcardblock = createReactBlockSpec(
  {
    type: "flashcard",
    propSchema: {
      topic: { default: "" },
      flashcardData: { default: "[]" }, // Stores the array of Q&A
      isGeneratingInitial: { default: true },
    },
    content: "none",
  },
  {
    render: (props) => {
      const [topic, settopic] = useState(props.block.props.topic || "");
      const [numberOfFlashcards, setNumberOfFlashcards] = useState("5");
      const [isLoading, setIsLoading] = useState(false);
      const isGeneratingInitial = props.block.props.isGeneratingInitial;
      const [isOpen, setIsOpen] = useState(false);

      // Flashcard Interaction State
      const [currentCardIndex, setCurrentCardIndex] = useState(0);
      const [isFlipped, setIsFlipped] = useState(false);

      // Parse data safely
      const flashcards = props.block.props.flashcardData
        ? JSON.parse(props.block.props.flashcardData)
        : [];

      useEffect(() => {
        if (props.block.props.isGeneratingInitial) {
          const timer = setTimeout(() => setIsOpen(true), 0);
          return () => clearTimeout(timer);
        }
      }, []);

      const handleGenerate = async () => {
        if (!topic) return;
        
        setIsLoading(true);
        try {
          const allBlocks = props.editor.document;
          const noteContent = allBlocks
            .map((block: any) => {
              if (Array.isArray(block.content)) {
                return block.content.map((c: any) => c.text || "").join("");
              }
              return "";
            })
            .filter((text: string) => text.trim() !== "")
            .join("\n");

          const count = parseInt(numberOfFlashcards);
          
          // Check for API keys
          let hasKeys = false;

          const keys = await getApiKeysMeta();
          hasKeys = keys.some(k => k.isValid);
          

          if (!hasKeys) {
              toast.error("Please configure an AI provider in Settings to use this feature.");
              setIsLoading(false);
              return;
          }

          const data = await generateFlashcardsAction(
            topic,
            count,
            noteContent
          );

          props.editor.updateBlock(props.block, {
            props: {
              topic: topic,
              flashcardData: JSON.stringify(data),
              isGeneratingInitial: false,
            },
          });
          toast.success("Flashcards generated successfully"); 
          setIsOpen(false);
        } catch (error) {
          console.log(error);
        } finally {
          setIsLoading(false);
        }
      };

      const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open && isGeneratingInitial && !isLoading) {
          setTimeout(() => props.editor.removeBlocks([props.block]), 100);
        }
      };

      // --- RENDER: INITIAL INPUT ---
      if (isGeneratingInitial) {
        return (
          <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <div className="h-12 w-full select-none" />
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-[900px] max-w-[90vw] border-none bg-transparent shadow-none"
              align="start"
              side="top"
              sideOffset={-44}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="flex items-center p-1 rounded-xl border bg-background shadow-lg">
                <Input
                  placeholder="What topic should these flashcards cover?"
                  value={topic}
                  onChange={(e) => settopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  className="flex-grow border-none shadow-none bg-transparent focus-visible:ring-0 text-base h-10 px-4"
                  autoFocus
                />
                <div className="flex items-center gap-2 border-l pl-2 ml-1">
                  <Select
                    value={numberOfFlashcards}
                    onValueChange={setNumberOfFlashcards}
                  >
                    <SelectTrigger className="w-[65px] h-9 border-none bg-transparent focus:ring-0 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 10, 15].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    onClick={handleGenerate}
                    disabled={!topic || isLoading}
                    className="h-9 w-9 rounded-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      }

      // --- RENDER: LOADING STATE ---
      if (isLoading) {
        return (
          <Card className="w-full my-4 p-8 flex flex-col items-center justify-center bg-muted/20 border-dashed">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">
              Generating flashcards...
            </p>
          </Card>
        );
      }

      // --- RENDER: FLASHCARD DISPLAY (The part you requested) ---
      const currentCard = flashcards[currentCardIndex];

      if (!currentCard)
        return <div className="p-4 text-red-500">Error loading cards.</div>;

      return (
        <div
          className="my-6 select-none group relative w-full"
          contentEditable={false} // Prevents cursor from getting stuck inside
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-muted-foreground font-normal"
              >
                {props.block.props.topic}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {currentCardIndex + 1} / {flashcards.length}
              </span>
            </div>

            {/* Delete Button */}
            {props.editor.isEditable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                onClick={() => props.editor.removeBlocks([props.block])}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* The Flippable Card */}
          <div
            className="perspective-1000 h-[300px] w-full cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div
              className={`relative w-full h-full duration-500 preserve-3d transition-transform ${isFlipped ? "rotate-y-180" : ""}`}
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* FRONT (Question) */}
              {!isFlipped && (
                <Card
                  className="absolute w-full h-full flex flex-col backface-hidden items-center justify-center p-8 text-center bg-card border-2 hover:border-primary/50 transition-colors"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="absolute top-4 backface-hidden left-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Question
                  </div>
                  <h3 className="text-xl font-medium backface-hidden leading-relaxed">
                    {currentCard.question}
                  </h3>
                  <div className="absolute bottom-4 text-xs backface-hidden text-muted-foreground flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Click to flip
                  </div>
                </Card>
              )}
              {/* BACK (Answer) */}
              <Card
                className="absolute w-full h-full backface-hidden flex flex-col items-center justify-center p-8 text-center bg-muted/50 border-2 border-primary/20"
                style={{
                  transform: "rotateY(180deg)",
                  backfaceVisibility: "hidden",
                }}
              >
                <div className="absolute top-4 left-4 text-xs font-bold text-primary uppercase tracking-widest">
                  Answer
                </div>
                <p className="text-lg text-foreground/90">
                  {currentCard.answer}
                </p>

                {/* Explanation (Optional) */}
                {currentCard.explanation && (
                  <div className="mt-4 p-2 bg-background/50 rounded text-sm text-muted-foreground max-w-[90%]">
                    <Lightbulb className="inline h-3 w-3 mr-1 mb-0.5 text-yellow-500" />
                    {currentCard.explanation}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button
              variant="outline"
              size="icon"
              disabled={currentCardIndex === 0}
              onClick={(e) => {
                e.stopPropagation(); // Prevent flipping when clicking nav
                setIsFlipped(false); // Reset flip
                setCurrentCardIndex((prev) => Math.max(0, prev - 1));
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              disabled={currentCardIndex === flashcards.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
                setCurrentCardIndex((prev) =>
                  Math.min(flashcards.length - 1, prev + 1)
                );
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    },
  }
);