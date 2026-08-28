import { z } from "zod";

export const videoIdParam = z.object({
  id: z.uuid(),
});

export const createVideoBody = z.object({
  title: z.string().min(1),
  sceneName: z.string().min(1),
  code: z.string().min(1),
  folderId: z.uuid().optional(),
  description: z.string().optional(),
  prompt: z.string().optional(),
  transcript: z.string().optional(),
  model: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateVideoBody = z.object({
  folderId: z.uuid().nullable().optional(),
  isPublic: z.boolean().optional(),
});

export const retryVideoBody = z.object({
  code: z.string().min(1),
  sceneName: z.string().min(1),
});

export const feedbackBody = z.object({
  type: z.enum(["like", "dislike"]),
  tags: z.array(z.string()).optional(),
});

export const myVideosQuery = z.object({
  folderId: z.uuid().optional(),
});
