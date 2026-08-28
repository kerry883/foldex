import { createReactBlockSpec } from "@blocknote/react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { Textarea } from "@workspace/ui/components/textarea"; // Make sure you have this component
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Trash2,
  Eye,
  RotateCcw,
  CheckSquare,
  CircleDot,
  Type,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { toast } from "sonner";
import { getApiKeysMeta } from "@/lib/services/localapikeys";
import { generateQuizzesAction, gradeFlashcardAnswer } from "@/lib/ai/unified-ai";

// --- MAIN BLOCK DEFINITION ---
export const QuizBlock = createReactBlockSpec(
  {
    type: "quiz",
    propSchema: {
      topic: { default: "" },
      quizzesData: { default: "[]" },
      isGeneratingInitial: { default: true },
    },
    content: "none",
  },
  {
    render: (props) => {
      // ... (State setup is identical to before) ...
      const [topicInput, setTopicInput] = useState(
        props.block.props.topic || ""
      );
      const [numQuestions, setNumQuestions] = useState("5");
      const [isLoading, setIsLoading] = useState(false);
      const [currentIndex, setCurrentIndex] = useState(0);
      const [isOpen, setIsOpen] = useState(false);
      const quizzesData = JSON.parse(props.block.props.quizzesData || "[]");
      const isGeneratingInitial = props.block.props.isGeneratingInitial;
      const currentQuiz = quizzesData[currentIndex];
      useEffect(() => {
        if (props.block.props.isGeneratingInitial) {
          const timer = setTimeout(() => setIsOpen(true), 0);
          return () => clearTimeout(timer);
        }
      }, []);

      // ... (handleGenerate is identical to your previous code) ...
      const handleGenerate = async () => {
        if (!topicInput) return;
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

          const count = parseInt(numQuestions);
          
          let hasKeys = false;
        
              const keys = await getApiKeysMeta();
              hasKeys = keys.some(k => k.isValid);
        

          if (!hasKeys) {
              toast.error("Please configure an AI provider in Settings to use this feature.");
              setIsLoading(false);
              return;
          }

          const data = await generateQuizzesAction(
            topicInput,
            count,
            noteContent
          );

          props.editor.updateBlock(props.block, {
            props: {
              topic: topicInput,
              quizzesData: JSON.stringify(data),
              isGeneratingInitial: false,
            },
          });
          toast.success("Quizzes generated successfully");
          setIsOpen(false);
        } catch (e) {
          console.error("Failed to generate quizzes:", e);
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

      // --- INITIAL POPUP UI (Same as before) ---
      if (isGeneratingInitial) {
        return (
          <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <div className="h-12 w-full select-none" />
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-[900px] bg-transparent border-none shadow-none"
              align="start"
              side="top"
              sideOffset={-44}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="flex items-center p-1 rounded-xl border bg-background shadow-lg">
                <Input
                  placeholder="Quiz topic?"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  className="flex-grow border-none shadow-none focus-visible:ring-0"
                  autoFocus
                />
                <div className="flex items-center gap-2 border-l pl-2">
                  <Select value={numQuestions} onValueChange={setNumQuestions}>
                    <SelectTrigger className="w-[65px] h-9 border-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 10].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    onClick={handleGenerate}
                    disabled={!topicInput || isLoading}
                    className="h-9 w-9 rounded-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <ArrowUp />
                    )}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      }

      if (isLoading)
        return (
          <Card className="p-8 flex justify-center">
            <Loader2 className="animate-spin" />
          </Card>
        );
      if (!currentQuiz) return null;

      // --- MAIN RENDER ---
      return (
        <div
          className="w-full my-6 select-none"
          contentEditable={false}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-normal">
                {props.block.props.topic}
              </Badge>
              <Badge
                variant="secondary"
                className={
                  currentQuiz.difficulty === "Easy"
                    ? "bg-green-100 text-green-800"
                    : currentQuiz.difficulty === "Medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }
              >
                {currentQuiz.difficulty}
              </Badge>
            </div>
            {props.editor.isEditable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                onClick={() => props.editor.removeBlocks([props.block])}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <QuizCard
            key={`${props.block.id}-${currentIndex}`} // Force re-render on slide change
            quizData={currentQuiz}
            index={currentIndex}
            total={quizzesData.length}
            topic={props.block.props.topic}
            onDelete={() => props.editor.removeBlocks([props.block])}
          />

          {/* NAVIGATION FOOTER */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                currentIndex > 0 && setCurrentIndex((curr) => curr - 1)
              }
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {currentIndex + 1} / {quizzesData.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                currentIndex < quizzesData.length - 1 &&
                setCurrentIndex((curr) => curr + 1)
              }
              disabled={currentIndex === quizzesData.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    },
  }
);

// --- COMPONENT: QUIZ CARD (UI & Logic) ---
const QuizCard = ({
  quizData,
  index,
  total,
  topic,
  onDelete,
}: {
  quizData: any;
  index: number;
  total: number;
  topic: string;
  onDelete: () => void;
}) => {
  // State
  const [userSelections, setUserSelections] = useState<string[]>([]);
  const [frqAnswer, setFrqAnswer] = useState("");
  const [status, setStatus] = useState<
    "idle" | "correct" | "incorrect" | "revealed" | "grading"
  >("idle");
  const [aiFeedback, setAiFeedback] = useState<any>(null); // For FRQ grading result
  const type = quizData.type; // 'single', 'multiple', 'frq'
  const isMulti = type === "multiple";
  const isFrq = type === "frq";

  // --- LOGIC: MC & SINGLE ---
  const handleSelect = (option: string) => {
    if (status !== "idle") return;
    if (isMulti) {
      setUserSelections((prev) =>
        prev.includes(option)
          ? prev.filter((i) => i !== option)
          : [...prev, option]
      );
    } else {
      setUserSelections([option]);
    }
  };

  const checkMcqAnswer = () => {
    const sortedUser = [...userSelections].sort();
    const sortedCorrect = [...quizData.correctAnswers].sort();
    const isMatch =
      JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
    setStatus(isMatch ? "correct" : "incorrect");
  };

  // --- LOGIC: FRQ ---
  const handleGradeFrq = async () => {
    if (!frqAnswer.trim()) return;
    setStatus("grading");
    try {
      // Call the unified action
      const result = await gradeFlashcardAnswer(
        frqAnswer,
        quizData.correctAnswers[0],
        quizData.question
      );
      setAiFeedback(result);
      setStatus(result.isCorrect ? "correct" : "incorrect");
    } catch (e) {
      console.error(e);
      setStatus("idle"); // Reset on error
    }
  };

  // --- COMMON LOGIC ---
  const reset = () => {
    setUserSelections([]);
    setFrqAnswer("");
    setStatus("idle");
    setAiFeedback(null);
  };

  return (
    <Card className="w-full shadow-md border bg-card relative overflow-hidden">
      {/* HEADER: Topic & Trash */}

      <CardContent className="p-6">
        {/* Question Type Label */}
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isFrq ? (
            <Type className="w-4 h-4" />
          ) : isMulti ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <CircleDot className="w-4 h-4" />
          )}
          {isFrq
            ? "Free Response"
            : isMulti
              ? "Select Multiple"
              : "Single Choice"}
        </div>

        {/* Question Text */}
        <h3 className="text-lg font-medium mb-6 leading-relaxed text-foreground">
          {quizData.question}
        </h3>

        {/* --- INPUT AREA --- */}
        <div className="mb-6">
          {isFrq ? (
            <Textarea
              placeholder="Type your answer here..."
              value={frqAnswer}
              onChange={(e) => setFrqAnswer(e.target.value)}
              disabled={status !== "idle"}
              className="min-h-[120px] max-h-[120px] overflow-y-auto scrollbar-hidden resize-none text-base p-4 bg-background"
            />
          ) : (
            <div className="space-y-3">
              {quizData.options?.map((option: string, i: number) => {
                const isSelected = userSelections.includes(option);
                const isAnswer = quizData.correctAnswers.includes(option);

                // Styling Logic
                let styles =
                  "border-transparent bg-secondary/30 hover:bg-secondary/60";
                if (status === "idle" && isSelected)
                  styles = "ring-2 ring-primary bg-secondary/50";
                if (status !== "idle" && status !== "grading") {
                  if (isAnswer)
                    styles =
                      "bg-green-100 border-green-500 text-green-900 dark:bg-green-900/30 dark:text-green-100";
                  else if (isSelected)
                    styles =
                      "bg-red-100 border-red-500 text-red-900 dark:bg-red-900/30 dark:text-red-100";
                  else styles = "opacity-50";
                }

                return (
                  <div
                    key={i}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      styles
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 flex items-center justify-center border rounded",
                        isMulti ? "rounded-sm" : "rounded-full",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground"
                      )}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 bg-current rounded-[1px]" />
                      )}
                    </div>
                    <span>{option}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- ACTION BUTTONS --- */}
        <div className="flex items-center gap-3">
          {status === "idle" ? (
            <>
              <Button
                onClick={isFrq ? handleGradeFrq : checkMcqAnswer}
                disabled={
                  (isFrq && !frqAnswer) ||
                  (!isFrq && userSelections.length === 0)
                }
                className="cursor-pointer"
              >
                {isFrq ? "Grade Answer" : "Check Answer"}
              </Button>
              {!isFrq && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStatus("revealed")}
                  title="Reveal Answer"
                  className="cursor-pointer"
                >
                  <HelpCircle className="w-5 h-5 text-muted-foreground" />
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              onClick={reset}
              className="cursor-pointer"
              disabled={status === "grading"}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          )}
        </div>

        {/* --- FEEDBACK SECTION --- */}
        {status !== "idle" && status !== "grading" && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-2">
            {isFrq || aiFeedback ? (
              // FRQ FEEDBACK UI
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  status === "correct"
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20"
                    : "bg-orange-50 border-orange-200 dark:bg-orange-900/20"
                )}
              >
                <div className="flex items-center gap-2 font-bold mb-2">
                  {status === "correct" ? (
                    <CheckCircle2 className="text-green-600" />
                  ) : (
                    <Sparkles className="text-orange-600" />
                  )}
                  <span
                    className={
                      status === "correct"
                        ? "text-green-700"
                        : "text-orange-700"
                    }
                  >
                    {status === "correct" ? "Great job!" : "Needs Improvement"}
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {aiFeedback?.score}/10
                  </Badge>
                </div>
                <p className="text-sm text-foreground/90 mb-3">
                  {aiFeedback?.feedback}
                </p>
                {aiFeedback?.missedConcepts?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Missed Concepts: </strong>{" "}
                    {aiFeedback?.missedConcepts.join(", ")}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t text-xs">
                  <span className="font-semibold">Answer: </span>
                  <span className="text-muted-foreground">
                    {quizData.correctAnswers[0]}
                  </span>
                </div>
              </div>
            ) : (
              // MCQ / REVEAL FEEDBACK UI
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  status === "correct"
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20"
                    : "bg-muted "
                )}
              >
                <div className="flex items-center gap-2 font-bold mb-2">
                  {status === "correct" ? (
                    <CheckCircle2 className="text-green-600" />
                  ) : (
                    <Eye className="text-blue-600" />
                  )}
                  <span>
                    {status === "correct" ? "Correct!" : "Explanation"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {quizData.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* GRADING LOADER */}
        {status === "grading" && (
          <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              AI is grading your answer...
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};