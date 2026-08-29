 ;

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { videoapi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { useTabNavigation } from "@/hooks/useTabNavigation";

type GenerationStatus = "idle" | "generating_code" | "submitting" | "polling" | "ready" | "failed";

interface GenerateVideoArgs {
    prompt: string;
    model: string;
    fileContext?: string;
    folderId?: string;
}

export function useGenerateVideo() {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<GenerationStatus>("idle");
    const [videoId, setVideoId] = useState<string | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const toastIdRef = useRef<string | number | null>(null);
    const { openInTab } = useTabNavigation();
    // Store the last args so we can retry
    const lastArgsRef = useRef<GenerateVideoArgs | null>(null);

    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const startPolling = useCallback((id: string) => {
        setVideoId(id);
        setStatus("polling");

        toastIdRef.current = toast.loading("Rendering your video...", {
            description: "This may take 1-3 minutes",
            duration: Infinity,
        });

        pollingRef.current = setInterval(async () => {
            try {
                const result = await videoapi.getstatus(id);

                if (result.status === "ready") {
                    stopPolling();
                    setStatus("ready");
                    if (toastIdRef.current) toast.dismiss(toastIdRef.current);
                    toast.success("Video is ready!", {
                        description: "Click to open your video",
                        action: {
                            label: "Open",
                            onClick: () => openInTab("video", id, undefined, "Video"),
                        },
                        duration: 10000,
                    });
                    queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
                } else if (result.status === "failed") {
                    stopPolling();
                    setStatus("failed");
                    if (toastIdRef.current) toast.dismiss(toastIdRef.current);
                    const error = result.error?.trim() || "No error stored on this video";
                    console.error("[useGenerateVideo] render failed", { videoId: id, error });
                    toast.error("Video generation failed", {
                        description: error.slice(0, 400),
                        action: {
                            label: "Retry",
                            onClick: () => handleRetry(id),
                        },
                        duration: 20000,
                    });
                    queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
                } else if (result.status === "generating") {
                    if (toastIdRef.current) {
                        toast.loading("Rendering your video...", {
                            id: toastIdRef.current,
                            description: "The renderer is processing your animation",
                        });
                    }
                }
            } catch (error) {
                console.error("[useGenerateVideo] Polling error:", error);
            }
        }, 3000);
    }, [stopPolling, queryClient, openInTab]);

    // Retry: fetch the failed video's error, ask AI to fix the code, re-submit
    const handleRetry = useCallback(async (failedVideoId: string) => {
        try {
            const video = await videoapi.get(failedVideoId);
            if (!video?.code || !video?.errorTraceback) {
                toast.error("Cannot retry — missing error info");
                return;
            }
                // Desktop: fix code locally using manim-agent
                toast.loading("AI is fixing the code...", { id: "retry-fix", duration: Infinity });
                const { fixManimCode } = await import("@/lib/ai/manim-agent");
                // We need a model instance — use the same provider
                // For desktop, the client-tools get the model from unified-ai
                const { getModelForRetry } = await import("@/lib/ai/unified-ai");
                const model = await getModelForRetry(video.model || undefined);
                if (!model) {
                    toast.dismiss("retry-fix");
                    toast.error("No API key available to retry. Configure one in Settings.");
                    return;
                }
                const fixed = await fixManimCode({
                    originalCode: video.code,
                    errorTraceback: video.errorTraceback,
                    model,
                });
                toast.dismiss("retry-fix");

                // Re-submit the fixed code to the retry endpoint
                const result = await videoapi.retry(failedVideoId, {
                    code: fixed.code,
                    sceneName: fixed.sceneName,
                });
                if (result.videoId) startPolling(result.videoId);
            
        } catch (error: any) {
            toast.dismiss("retry-fix");
            toast.error("Retry failed", { description: error?.message || "Unknown error" });
        }
    }, [startPolling]);

    const generateMutation = useMutation({
        mutationFn: async (args: GenerateVideoArgs) => {
            lastArgsRef.current = args;
            
                // Desktop flow: generate code locally using manim-agent, then submit
                setStatus("generating_code");
                toastIdRef.current = toast.loading("AI is writing your animation code...", {
                    description: "This takes 15-30 seconds",
                });

                const { generateManimCode } = await import("@/lib/ai/manim-agent");
                const { getModelForGeneration } = await import("@/lib/ai/unified-ai");
                const model = await getModelForGeneration(args.model);
                if (!model) {
                    throw new Error("Could not initialize model. Check your API key in Settings.");
                }

                const manimResult = await generateManimCode({
                    prompt: args.prompt,
                    fileContext: args.fileContext,
                    model,
                });

                if (toastIdRef.current) toast.dismiss(toastIdRef.current);
                setStatus("submitting");

                const result = await videoapi.generate({
                    title: manimResult.title,
                    sceneName: manimResult.sceneName,
                    code: manimResult.code,
                    folderId: args.folderId,
                    description: manimResult.description,
                    prompt: args.prompt + args.fileContext,
                });
                return result;
        },
        onSuccess: (data) => {
            if (data.videoId) {
                startPolling(data.videoId);
                queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
            }
        },
        onError: (error: any) => {
            setStatus("failed");
            if (toastIdRef.current) toast.dismiss(toastIdRef.current);
            const message = error instanceof Error ? error.message : "Failed to generate video";
            toast.error("Generation failed", { description: message });
        },
    });

    const reset = useCallback(() => {
        stopPolling();
        setStatus("idle");
        setVideoId(null);
    }, [stopPolling]);

    return {
        generateVideo: generateMutation.mutate,
        generateVideoAsync: generateMutation.mutateAsync,
        isGenerating: generateMutation.isPending,
        status,
        videoId,
        reset,
        handleRetry,
    };
}
