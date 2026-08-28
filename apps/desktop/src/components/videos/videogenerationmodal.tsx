import { useState, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select"; 
import {
    Upload,
    X,
    FileText,
    Image as ImageIcon,
    Sparkles,
    Loader2,
    Video,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import { useGenerateVideo } from "@/hooks/useGenerateVideo";
import { extractTextFromFilePart } from "@/lib/ai/file-parser";
import { PROVIDERS, getAvailableModels } from "@/lib/providers";
import { useApiKeys } from "@/hooks/use-settings";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface VideoGenerationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    folderId?: string;
}

const ACCEPTED_FILE_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/plain",
    "text/markdown",
];

export function VideoGenerationModal({ open, onOpenChange, folderId }: VideoGenerationModalProps) {
    const [prompt, setPrompt] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [extractedText, setExtractedText] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const isOnline = useOnlineStatus();

    const { generateVideo, isGenerating } = useGenerateVideo();
    const {data:apiKeys =[],isLoading:isapikeyloading}=useApiKeys();

    const configuredProviders = apiKeys 
        .filter((k) => k.isValid)
        .map((k) => k.provider);

    const availableModels = getAvailableModels(configuredProviders);

    // File handling
    const handleFileSelect = useCallback(async (file: File) => {
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
            toast.error("Unsupported file type", {
                description: "Please upload PDF, DOCX, PPTX, image, or text files.",
            });
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            toast.error("File too large", { description: "Maximum file size is 20MB." });
            return;
        }

        setAttachedFile(file);
        setIsExtracting(true);

        try {
            const url = URL.createObjectURL(file);
            const result = await extractTextFromFilePart({
                mediaType: file.type,
                url,
                filename: file.name,
            });
            setExtractedText(result.text);
            toast.success(`Extracted text from ${file.name}`, {
                description: `${result.text.length} characters extracted via ${result.method}`,
            });
        } catch (error) {
            toast.error("Failed to extract text", {
                description: `Could not read ${file.name}. Try a different format.`,
            });
            setAttachedFile(null);
            setExtractedText(null);
        } finally {
            setIsExtracting(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const removeFile = useCallback(() => {
        setAttachedFile(null);
        setExtractedText(null);
    }, []);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }
        if (!selectedModel) {
            toast.error("Please select a model");
            return;
        }
        if(!isOnline){
            toast.info("Your are offline,video generation requires and internet connection ")
            return;
        }

        generateVideo({
            prompt: prompt.trim(),
            model: selectedModel,
            fileContext: extractedText || undefined,
            folderId:folderId,
        });

        // Close modal — polling + toasts handle the rest
        onOpenChange(false);
        setPrompt("");
        setSelectedModel("");
        removeFile();
    };

    const canGenerate = prompt.trim().length > 0 && selectedModel && !isGenerating && !isExtracting;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Video className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                                Generate Video
                                <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0 bg-primary/10 text-primary border-0">
                                    BETA
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">
                                AI will create an animated explainer video with voiceover
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-4">
                    {/* Prompt */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            What do you want explained?
                        </label>
                        <Textarea
                            placeholder="e.g., Explain how binary search works with step-by-step visualization..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="min-h-[100px] max-h-[100px] resize-none"
                            maxLength={2000}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {prompt.length}/2000
                        </p>
                    </div>

                    {/* File Drop Zone */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Reference material <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        {attachedFile ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                                    {attachedFile.type.startsWith("image/") ? (
                                        <ImageIcon className="h-4 w-4 text-primary" />
                                    ) : (
                                        <FileText className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{attachedFile.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {isExtracting ? (
                                            <span className="flex items-center gap-1">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Extracting text...
                                            </span>
                                        ) : extractedText ? (
                                            `${extractedText.length} characters extracted`
                                        ) : (
                                            "Processing..."
                                        )}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={removeFile}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                                    isDragging
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                                )}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Drop a file here or <span className="text-primary font-medium">browse</span>
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    PDF, DOCX, PPTX, images, or text
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept={ACCEPTED_FILE_TYPES.join(",")}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileSelect(file);
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Model Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            AI Model
                        </label>
                        {availableModels.length === 0 ? (
                            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                                <span className="text-muted-foreground">
                                    No API keys configured. Add one in{" "}
                                    <span className="text-foreground font-medium">Settings → API Keys</span>
                                </span>
                            </div>
                        ) : (
                            <Select defaultValue={availableModels[0].model.id} value={selectedModel} onValueChange={setSelectedModel}>
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder="Choose a model..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableModels.map((m) => (
                                        <SelectItem key={m.model.id} value={m.model.id} className="cursor-pointer">
                                            <div className="flex items-center gap-2 ">
                                                <span>{m.model.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    ({m.provider})
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Generate Button */}
                    <Button
                        className="w-full gap-2 cursor-pointer"
                        size="lg"
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Generate Video
                            </>
                        )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                        Videos take 1-3 minutes to render. You'll get a notification when ready.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
