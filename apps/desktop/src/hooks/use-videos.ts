import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { videoapi } from "@/lib/api"
import type { FeedbackBody } from "@/lib/api-types"

// ============================================
// QUERIES
// ============================================

export function useMyVideos(folderId?: string) {
    return useQuery({
        queryKey: folderId
            ? [...queryKeys.videos.mine(), folderId]
            : queryKeys.videos.mine(),
        queryFn: async () => {
            return videoapi.my(folderId);
        },
    })
}

export function usePublicVideos() {
    return useQuery({
        queryKey: queryKeys.videos.public(),
        queryFn: () => videoapi.public(),
    })
}

export function useVideo(id: string) {
    return useQuery({
        queryKey: queryKeys.videos.detail(id),
        queryFn: () => videoapi.get(id),
        enabled: !!id,
    })
}

export function useVideoStatus(id: string, enabled: boolean = false) {
    return useQuery({
        queryKey: [...queryKeys.videos.detail(id), "status"],
        queryFn: () => videoapi.getstatus(id),
        enabled: enabled && !!id,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (!data) return 3000;
            // Stop polling once we reach a terminal state
            if (data.status === "ready" || data.status === "failed") return false;
            return 3000;
        },
    })
}

// ============================================
// MUTATIONS
// ============================================

export function useDeleteVideo() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => videoapi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.videos.all })
        },
    })
}

export function useUpdateVideo() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: { folderId?: string | null; isPublic?: boolean } }) => {
            let finalData = { ...data };
            return videoapi.update(id, { id, ...finalData });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.videos.all })
        },
    })
}

export function useSubmitFeedback() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ videoId, body }: { videoId: string; body: FeedbackBody }) =>
            videoapi.submitFeedback(videoId, body),
        onSuccess: (_, variables) => {
            // Refresh the specific video and feedback cache
            queryClient.invalidateQueries({ queryKey: queryKeys.videos.detail(variables.videoId) })
        },
    })
}

export function useUserFeedback(videoId: string) {
    return useQuery({
        queryKey: [...queryKeys.videos.detail(videoId), "feedback"],
        queryFn: () => videoapi.getFeedback(videoId),
        enabled: !!videoId,
    })
}
