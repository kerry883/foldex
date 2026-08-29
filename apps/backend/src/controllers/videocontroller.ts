import type { Context } from "hono";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../lib/db";
import { videos, videoFeedback } from "../db/schema";
import { videoQueue } from "../lib/queue";
import type { Appvariables } from "../env";
import type {
  createVideoBody,
  feedbackBody,
  myVideosQuery,
  retryVideoBody,
  updateVideoBody,
  videoIdParam,
} from "../lib/video-schema";

type AuthedContext = Context<{ Variables: Appvariables }, string, any>;
type VideoRow = typeof videos.$inferSelect;

type VideoSource = {
  title?: string;
  url: string;
  snippet?: string;
};

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function asSources(value: unknown): VideoSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value as VideoSource[];
}

function serializeVideo(video: VideoRow) {
  return {
    ...video,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    title: video.title ?? undefined,
    description: video.description ?? undefined,
    transcript: video.transcript ?? undefined,
    url: video.url ?? undefined,
    thumbnail: video.thumbnail ?? undefined,
    prompt: video.prompt ?? undefined,
    creatorname: video.creatorname ?? undefined,
    creatorprofile: video.creatorprofile ?? undefined,
    code: video.code ?? undefined,
    model: video.model ?? undefined,
    errorTraceback: video.errorTraceback ?? undefined,
    tags: asStringArray(video.tags),
    sources: asSources(video.sources),
  };
}

function jsonBody<T>(c: Context): T {
  return c.req.valid("json" as never);
}

function paramBody<T>(c: Context): T {
  return c.req.valid("param" as never);
}

function queryBody<T>(c: Context): T {
  return c.req.valid("query" as never);
}

const DAILY_VIDEO_LIMIT = 5;

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(videos)
    .where(
      and(
        eq(videos.userId, userId),
        gte(videos.createdAt, twentyFourHoursAgo),
        eq(videos.status, "ready"),
      ),
    );
  const count = result?.count ?? 0;
  return { allowed: count < DAILY_VIDEO_LIMIT, remaining: Math.max(0, DAILY_VIDEO_LIMIT - count) };
}

export const generatevideo = async (c: AuthedContext) => {
  const user = c.get("user");
  const body = jsonBody<z.infer<typeof createVideoBody>>(c);

  const { allowed, remaining } = await checkRateLimit(user.id);
  if (!allowed) {
    return c.json({ error: "Daily video limit reached (5/day during beta)", remaining: 0 }, 429);
  }

  const [video] = await db
    .insert(videos)
    .values({
      userId: user.id,
      folderId: body.folderId ?? null,
      creatorname: user.name,
      creatorprofile: user.image,
      title: body.title,
      code: body.code,
      description: body.description,
      transcript: body.transcript,
      model: body.model,
      tags: body.tags,
      status: "queued",
      prompt: body.prompt,
      isPublic: true,
    })
    .returning();

  const job = await videoQueue.add(
    "render-job",
    {
      videoId: video.id,
      code: body.code,
      sceneName: body.sceneName,
      transcript: body.transcript,
      retryCount: 0,
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  console.log("[api] enqueued video render", {
    videoId: video.id,
    jobId: job.id,
    sceneName: body.sceneName,
    codeChars: body.code.length,
    hasTranscript: Boolean(body.transcript),
    remaining: remaining - 1,
  });

  return c.json({ success: true, videoId: video.id, remaining: remaining - 1 }, 202);
};

export const getvideo = async (c: Context) => {
  const { id } = paramBody<z.infer<typeof videoIdParam>>(c);
  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video) return c.json({ error: "video not found" }, 404);
  return c.json(serializeVideo(video), 200);
};

export const getpublicvideos = async (c: Context) => {
  const publicvideos = await db
    .select()
    .from(videos)
    .where(eq(videos.status, "ready"))
    .orderBy(desc(videos.createdAt));
  return c.json(publicvideos.map(serializeVideo), 200);
};

export const getmyvideos = async (c: AuthedContext) => {
  const user = c.get("user");
  const { folderId } = queryBody<z.infer<typeof myVideosQuery>>(c);

  const myvideos = folderId
    ? await db
        .select()
        .from(videos)
        .where(and(eq(videos.userId, user.id), eq(videos.folderId, folderId)))
        .orderBy(desc(videos.createdAt))
    : await db
        .select()
        .from(videos)
        .where(eq(videos.userId, user.id))
        .orderBy(desc(videos.createdAt));

  return c.json(myvideos.map(serializeVideo), 200);
};

export const deletevideo = async (c: AuthedContext) => {
  const user = c.get("user");
  const { id } = paramBody<z.infer<typeof videoIdParam>>(c);

  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video) return c.json({ error: "video not found" }, 404);
  if (video.userId !== user.id) {
    return c.json({ error: "you are not authorized to delete this video" }, 403);
  }

  if (video.status === "ready") {
    await db
      .update(videos)
      .set({
        userId: null,
        isPublic: true,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, id));
  } else {
    await videoQueue.remove(id);
    await db.delete(videos).where(eq(videos.id, id));
  }

  return c.json({ success: true }, 200);
};

export const updatevideo = async (c: AuthedContext) => {
  const user = c.get("user");
  const { id } = paramBody<z.infer<typeof videoIdParam>>(c);
  const body = jsonBody<z.infer<typeof updateVideoBody>>(c);

  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video) return c.json({ error: "video not found" }, 404);
  if (video.userId !== user.id) {
    return c.json({ error: "you are not authorized to update this video" }, 403);
  }

  await db
    .update(videos)
    .set({
      folderId: body.folderId !== undefined ? body.folderId : video.folderId,
      isPublic: body.isPublic !== undefined ? body.isPublic : video.isPublic,
      updatedAt: new Date(),
    })
    .where(eq(videos.id, id));

  return c.json({ success: true }, 200);
};

export const submitFeedback = async (c: AuthedContext) => {
  const user = c.get("user");
  const { id: videoId } = paramBody<z.infer<typeof videoIdParam>>(c);
  const body = jsonBody<z.infer<typeof feedbackBody>>(c);
  const feedbackType = body.type;

  const [existing] = await db
    .select()
    .from(videoFeedback)
    .where(and(eq(videoFeedback.videoId, videoId), eq(videoFeedback.userId, user.id)));

  if (existing) {
    if (existing.type === feedbackType) {
      await db.delete(videoFeedback).where(eq(videoFeedback.id, existing.id));
      if (feedbackType === "like") {
        await db
          .update(videos)
          .set({ likes: sql`GREATEST(0, ${videos.likes} - 1)` })
          .where(eq(videos.id, videoId));
      } else {
        await db
          .update(videos)
          .set({ dislikes: sql`GREATEST(0, ${videos.dislikes} - 1)` })
          .where(eq(videos.id, videoId));
      }
      return c.json({ success: true, action: "removed" as const, currentVote: null }, 200);
    }

    await db
      .update(videoFeedback)
      .set({
        type: feedbackType,
        tags: body.tags ?? null,
        createdAt: new Date(),
      })
      .where(eq(videoFeedback.id, existing.id));

    if (feedbackType === "like") {
      await db
        .update(videos)
        .set({
          likes: sql`${videos.likes} + 1`,
          dislikes: sql`GREATEST(0, ${videos.dislikes} - 1)`,
        })
        .where(eq(videos.id, videoId));
    } else {
      await db
        .update(videos)
        .set({
          dislikes: sql`${videos.dislikes} + 1`,
          likes: sql`GREATEST(0, ${videos.likes} - 1)`,
        })
        .where(eq(videos.id, videoId));
    }

    return c.json({ success: true, action: "switched" as const, currentVote: feedbackType }, 200);
  }

  await db.insert(videoFeedback).values({
    videoId,
    userId: user.id,
    type: feedbackType,
    tags: body.tags ?? null,
  });

  if (feedbackType === "like") {
    await db.update(videos).set({ likes: sql`${videos.likes} + 1` }).where(eq(videos.id, videoId));
  } else {
    await db
      .update(videos)
      .set({ dislikes: sql`${videos.dislikes} + 1` })
      .where(eq(videos.id, videoId));
  }

  return c.json({ success: true, action: "created" as const, currentVote: feedbackType }, 200);
};

export const getUserFeedback = async (c: AuthedContext) => {
  const user = c.get("user");
  const { id: videoId } = paramBody<z.infer<typeof videoIdParam>>(c);

  const [existing] = await db
    .select()
    .from(videoFeedback)
    .where(and(eq(videoFeedback.videoId, videoId), eq(videoFeedback.userId, user.id)));

  return c.json(
    {
      currentVote: existing?.type ?? null,
      tags: existing?.tags ?? null,
    },
    200,
  );
};

export const getvideostatus = async (c: Context) => {
  const { id } = paramBody<z.infer<typeof videoIdParam>>(c);
  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video) return c.json({ error: "video not found" }, 404);

  return c.json(
    {
      id: video.id,
      status: video.status,
      videoUrl: video.url,
      thumbnail: video.thumbnail,
      error: video.status === "failed" ? (video.errorTraceback ?? "") : "",
    },
    200,
  );
};

export const retryVideo = async (c: AuthedContext) => {
  const user = c.get("user");
  const { id: videoId } = paramBody<z.infer<typeof videoIdParam>>(c);
  const body = jsonBody<z.infer<typeof retryVideoBody>>(c);

  const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
  if (!video) return c.json({ error: "video not found" }, 404);
  if (video.userId !== user.id) return c.json({ error: "not authorized" }, 403);
  if (video.status !== "failed") return c.json({ error: "video is not in failed state" }, 400);

  await db
    .update(videos)
    .set({
      code: body.code,
      status: "queued",
      errorTraceback: null,
      updatedAt: new Date(),
    })
    .where(eq(videos.id, videoId));

  const job = await videoQueue.add(
    "render-job",
    {
      videoId,
      code: body.code,
      sceneName: body.sceneName,
      transcript: video.transcript,
      retryCount: 0,
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  console.log("[api] enqueued video retry", {
    videoId,
    jobId: job.id,
    sceneName: body.sceneName,
    codeChars: body.code.length,
  });

  return c.json({ success: true, videoId, explanation: "Queued with desktop-fixed code" }, 202);
};
