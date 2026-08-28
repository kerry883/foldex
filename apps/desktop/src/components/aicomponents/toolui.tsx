import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Forward,
  Notebook,
  Brain,
  Folder,
  CheckCircle2,
  FileSearch,
  Terminal,
  ArrowRight,
  Code2,
  FileText,
  PenLine,
  BrainCircuit,
  Layers,
  Network,
  PenTool,
  PlaySquare,
  BookOpen,
  AlertCircle,
  X,
  Sidebar,
  ExternalLink,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useEffect, useMemo } from "react";
import { Download } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import { addVideoOutputSchema, createFolderOutputSchema, createNoteOutputSchema, generateCodeSnippetOutputSchema, generateMermaidDiagramOutputSchema, getFolderItemsOutputSchema, searchWebOutputSchema, updateFolderOutputSchema, updateNoteOutputSchema, youtubeVideoOutputSchema } from "@/lib/aitooltypes";
import { Spinner } from "@workspace/ui/components/spinner";
import { VideoPlayer } from "../videos/videoplayer";
import { useVideo } from "@/hooks/use-videos";

const FLASHCARD_BASE_CLASSES =
  "group relative flex flex-col items-center justify-center text-center min-h-[200px] w-full max-w-sm p-6 my-4 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer select-none";

const FLASHCARD_TEXT_CLASSES =
  "text-xl md:text-2xl font-medium text-card-foreground leading-snug";

const ARTIFACT_BASE_CLASSES =
  "group relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground w-full max-w-3xl my-4  cursor-pointer";
const ARTIFACT_HEADER_CLASSES =
  "flex items-center justify-between px-6 py-4 rounded-lg border-b border-border bg-card/50 supports-[backdrop-filter]:bg-card/20 supports-[backdrop-filter]:backdrop-blur-md";
const ARTIFACT_CONTENT_PAD = "p-6 min-h-[150px]";
// --- COMPONENTS ---

export const CreateNote = ({ output }: { output: unknown }) => {
  const { openNote } = useCanvasStore();
  const parsed = useMemo(
    () => createNoteOutputSchema.safeParse(output),
    [output],
  );

  if (!parsed.success || !parsed.data.success) {
    return null;
  }
  const { data } = parsed;

  return (
    <div
      onClick={() => openNote(data.note.id)}
      className="inline-flex items-center gap-3 px-4 py-3 my-2 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer shadow-sm select-none"
    >
      {/* Icon Container */}
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
        <FileText className="h-4 w-4 text-primary" />
      </div>

      {/* Text Content */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          Created "{data.note.title}"
        </span>
      </div>
    </div>
  );
};

export const LoadingNote = ({ title }: { title: string }) => {
  return (
    <div className="inline-flex items-center gap-3 px-4 py-3 my-2 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer shadow-sm select-none">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10">
        <Notebook className="h-4 w-4 text-blue-500" />
      </div>

      <div className="flex gap-2">
        <span className="text-sm font-medium text-foreground">
          {" "}
          <Spinner className="size-4" />
          {title}
        </span>
      </div>
    </div>
  );
};

// UpdateNote Component (This was correct)
export const UpdateNote = ({ output }: { output: unknown }) => {
  const { openNote } = useCanvasStore();
  const parsed = useMemo(
    () => updateNoteOutputSchema.safeParse(output),
    [output],
  );

  if (!parsed.success || !parsed.data.success) {
    return null;
  }
  const { data } = parsed;
  return (
    <div
      onClick={() => openNote(data.note.id)}
      className="inline-flex items-center gap-3 px-4 py-3 my-2 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer shadow-sm select-none"
    >
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10">
        <PenLine className="h-4 w-4 text-blue-500" />
      </div>

      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          Updated Note "{data.note.title}"
        </span>
      </div>
    </div>
  );
};

export const GetFolderItems = ({ output }: { output: unknown }) => {
  const parsed = useMemo(
    () => getFolderItemsOutputSchema.safeParse(output),
    [output],
  );
  if (!parsed.success || !parsed.data.success) {
    return null;
  }
  const { data } = parsed;
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-start gap-2">
          <Folder className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <CardTitle className="text-sm font-medium">
              Analyzed Folder Contents
            </CardTitle>
          </div>
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
          {data.subfolders?.length > 0 && (
            <span>{data.subfolders.length} subfolders</span>
          )}
          <span>{data.notes.length} notes</span>
        </div>
      </CardContent>
    </Card>
  );
};

export const LoadingCodeSnippet = ({ title }: { title: string }) => {
  return (
    <div className={ARTIFACT_BASE_CLASSES}>
      {/* HEADER */}
      <div className={ARTIFACT_HEADER_CLASSES}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-md border border-border">
            <Code2 className={`h-5 w-5`} />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold">
              {" "}
              <Spinner className="size-4" />
              {title}
            </span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium"></span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Terminal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
export const GenerateCodeSnippet = ({ output }: { output: unknown }) => {
  const { openCode } = useCanvasStore();
  const parsed = useMemo(
    () => generateCodeSnippetOutputSchema.safeParse(output),
    [output],
  );

  if (!parsed.success || !parsed.data.success) return null;
  const { data } = parsed;

  // Function to determine color based on language
  const getLangColor = (lang: string) => {
    if (lang.includes("py")) return "text-yellow-400"; // Python
    if (lang.includes("ts") || lang.includes("js")) return "text-blue-400"; // JS/TS
    return "text-zinc-400";
  };

  return (
    <div
      className={ARTIFACT_BASE_CLASSES}
      onClick={() =>
        openCode({
          title: data.title,
          language: data.language,
          code: data.code,
          description: data.description,
        })
      }
    >
      {/* HEADER */}
      <div className={ARTIFACT_HEADER_CLASSES}>
        <div className="flex items-center gap-3 rounded-t-lg">
          <div className="p-2 bg-muted rounded-md border border-border">
            <Code2 className={`h-5 w-5 ${getLangColor(data.language)}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold">{data.title}</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {data.language}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Terminal className="h-4 w-4" />
        </Button>
      </div>

      {/* CODE PREVIEW AREA - Use bg-muted for standard code block look */}
      <div
        className={`bg-muted ${ARTIFACT_CONTENT_PAD} font-mono text-sm overflow-hidden relative`}
      >
        <div className="flex gap-4">
          {/* Line Numbers - using text-muted-foreground/50 for subtlety */}
          <div className="flex flex-col text-muted-foreground/50 select-none text-right min-w-[24px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          {/* Code Text - using text-muted-foreground for contrast against bg-muted */}
          <div className="text-muted-foreground whitespace-pre font-medium opacity-90 leading-relaxed">
            {data.code.split("\n").slice(0, 8).join("\n")}...
          </div>
        </div>
        {/* Gradient Overlay using theme colors */}
        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-muted to-transparent" />
      </div>
    </div>
  );
};

export const LoadingMermaidDiagram = ({ title }: { title: string }) => {
  return (
    <div className={ARTIFACT_BASE_CLASSES}>
      <div className={ARTIFACT_HEADER_CLASSES}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-md border border-border">
            <Network className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold">
              {" "}
              <Spinner className="size-4" />
              {title}
            </span>
            <span className="text-xs text-muted-foreground">
              {"Interactive Diagram"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GenerateMermaidDiagram = ({ output }: { output: unknown }) => {
  const { openMermaid } = useCanvasStore();
  const parsed = useMemo(
    () => generateMermaidDiagramOutputSchema.safeParse(output),
    [output],
  );

  if (!parsed.success || !parsed.data.success) return null;
  const { data } = parsed;

  return (
    <div
      className={ARTIFACT_BASE_CLASSES}
      onClick={() =>
        openMermaid({
          title: data.title,
          diagram: data.diagram,
          description: data.description,
        })
      }
    >
      <div className={ARTIFACT_HEADER_CLASSES}>
        <div className="flex items-center gap-3 rounded-lg">
          <div className="p-2 bg-muted rounded-md border border-border">
            <Network className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold">
              {" "}
              Created Diagram :{data.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {data.description || "Interactive Diagram"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};



export const YouTubeEmbed = ({ output }: { output: unknown }) => {
  const { openYtVideo } = useCanvasStore();
  const parsed = useMemo(
    () => youtubeVideoOutputSchema.safeParse(output),
    [output],
  );

  if (!parsed.success || !parsed.data.success) return null;
  const { data } = parsed;
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card my-2 shadow-sm">
      <div className="p-2 flex flex-col  gap-2">
        <div className="flex items-center justify-between">
          <p>{data.title} </p>
          <Button
            className="cursor-pointer"
            onClick={() =>
              openYtVideo({ title: data.title, videoId: data.videoId })
            }
          >
            <PlaySquare />
          </Button>
        </div>

        <span className="text-xs text-muted-foreground">
          {data.description}{" "}
        </span>
      </div>
      <div className="aspect-video">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${data.videoId}`}
          title={data.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="border-0"
        />
      </div>
    </div>
  );
};

export const LoadingFolder = ({ title }: { title: string }) => {
  return (
    <div className="inline-flex items-center gap-3 px-4 py-3 my-2 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer shadow-sm select-none">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10">
        <Folder className="h-4 w-4 text-blue-500" />
      </div>

      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          <Spinner className="size-4" />
          {title}
        </span>
      </div>
    </div>
  );
};

export const CreateFolder = ({ output }: { output: unknown }) => {
  const parsed = useMemo(
    () => createFolderOutputSchema.safeParse(output),
    [output],
  );

  if (!parsed.success || !parsed.data.success) return null;
  const { data } = parsed;
  return (
    <div className="inline-flex items-center gap-3 px-4 py-3 my-2 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer shadow-sm select-none">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10">
        <Folder className="h-4 w-4 text-blue-500" />
      </div>

      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {data.message}
        </span>
      </div>
    </div>
  );
};

export const UpdateFolder = ({ output }: { output: unknown }) => {
  const parsed = useMemo(
    () => updateFolderOutputSchema.safeParse(output),
    [output],
  );

  if (!parsed.success || !parsed.data.success) return null;
  const { data } = parsed;
  return (
    <div className="inline-flex items-center gap-3 px-4 py-3 my-2 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer shadow-sm select-none">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10">
        <Folder className="h-4 w-4 text-blue-500" />
      </div>

      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {data.message}
        </span>
      </div>
    </div>
  );
};

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
};

export function SourceGrid({ output }: { output: unknown }) {
  const parsed = useMemo(
    () => searchWebOutputSchema.safeParse(output),
    [output],
  );

  if (!parsed.success || !parsed.data.success) return null;
  const { data } = parsed;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 mb-8">
      {data?.sources?.map((source, idx) => {
        const domain = getDomain(source.url);
        // Using Google's favicon service
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

        return (
          <a
            key={idx}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col justify-between p-3 rounded-lg  bg-card  text-sm leading-snug h-24"
          >
            {/* Top: Title */}
            <span className="font-medium text-foreground line-clamp-2 overflow-hidden text-ellipsis">
              {source.title}
            </span>

            {/* Bottom: Favicon + Domain */}
            <div className="flex items-center gap-2 mt-2">
              <img
                src={faviconUrl}
                alt={domain}
                className="w-4 h-4 rounded-sm object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/fallback-icon.png";
                }}
              />
              <span className="text-xs text-gray-500 truncate max-w-full">
                {idx + 1}. {domain}
              </span>
              <ExternalLink className="w-3 h-3 opacity-0 " />
            </div>
          </a>
        );
      })}
    </div>
  );
}

export function GenerateVideo({ output }: { output: unknown }) {
  const parsed = useMemo(
    () => addVideoOutputSchema.safeParse(output),
    [output],
  );

  if (!parsed.success || !parsed.data.success) return null;

  const { data } = parsed;
  const {data:video} = useVideo(data.videoId);
  const { openAivideo } = useCanvasStore();

  const isGenerating = video?.status === "generating";

  // === GENERATING STATE ===
  if (isGenerating) {
    return (
      <div className="my-4 w-full">
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gradient-to-br from-muted via-muted/50 to-muted border border-border/50 shadow-lg">
          {/* Animated gradient overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
            style={{ animation: "shimmer 2s infinite" }}
          />

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            {/* Spinner */}
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full border-4 border-muted-foreground/20 border-t-primary"
                style={{ animation: "spin 1s linear infinite" }}
              />
            </div>

            {/* Status text */}
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">
                Creating your video...
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                This may take a few moments. Your video will appear here when
                ready.
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex gap-2 mt-2">
              <span
                className="w-2 h-2 bg-primary rounded-full"
                style={{
                  animation: "bounce 1s infinite",
                  animationDelay: "-0.3s",
                }}
              />
              <span
                className="w-2 h-2 bg-primary rounded-full"
                style={{
                  animation: "bounce 1s infinite",
                  animationDelay: "-0.15s",
                }}
              />
              <span
                className="w-2 h-2 bg-primary rounded-full"
                style={{ animation: "bounce 1s infinite" }}
              />
            </div>
          </div>

          {/* Bottom progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/20 overflow-hidden">
            <div
              className="h-full bg-primary/50"
              style={{ animation: "progress 2s ease-in-out infinite" }}
            />
          </div>
        </div>

        {/* Inline animations for Tailwind v4 compatibility */}
        <style >{`
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          @keyframes progress {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </div>
    );
  }

  // === FAILED STATE ===
  if (video?.status === "failed") {
    return (
      <div className="my-4 w-full">
        <div className="relative aspect-video w-full rounded-xl overflow-hidden border-2 border-destructive/50 bg-destructive/5 shadow-lg">
          {/* Subtle pattern background */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0 text-destructive"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 20px)",
              }}
            />
          </div>

          {/* Error content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            {/* Error icon */}
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>

            {/* Error message */}
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">
                Video Generation Failed
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                Something went wrong while creating your video. Please try
                again.
              </p>
            </div>

            {/* Failed badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-sm font-medium">
              <X className="w-4 h-4" />
              Generation failed
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === READY STATE ===
  if (video?.status === "ready" && video.url) {
    return (
      <div className="my-4 w-full">
        <div className="flex flex-col w-full bg-card p-2 rounded-t-lg">
          <div className="flex justify-between items-center">
            <p className="text-lg font-semibold">{video.title}</p>
            <Button
              variant="outline"
              onClick={() =>
                openAivideo({
                  src: video.url as string,
                  title: video.title as string,
                  poster: video.thumbnail as string,
                  description: video.description as string,
                })
              }
            >
              <Sidebar />
            </Button>
          </div>
          <p className="text-sm truncate text-muted-foreground">
            {video.description}
          </p>
        </div>
        <VideoPlayer
          src={video.url}
          title={video.title}
          poster={video.thumbnail}
          className="w-full shadow-md border"
        />
      </div>
    );
  }

  return null;
}

