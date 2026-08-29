import { Job, UnrecoverableError, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { videos } from "./db/schema";
import { db } from "./lib/db";
import { runMigrations } from "./lib/migrate";
import { createRedis } from "./lib/redis";

const RENDER_TIMEOUT_MS = 15 * 60 * 1000;

console.log("[worker] starting", {
  manimFlaskUrl: process.env.MANIM_FLASK_URL ?? "(unset, default localhost:5001)",
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  redisConfigured: Boolean(process.env.REDIS_URL),
});

try {
  await runMigrations();
  console.log("[worker] migrations complete");
} catch (error) {
  console.error("[worker] migrations failed", error);
  throw error;
}

const rendererUrl = (process.env.MANIM_FLASK_URL ?? "http://localhost:5001").replace(
  /\/$/,
  "",
);

console.log("[worker] renderer target", { rendererUrl, generatePath: `${rendererUrl}/generate-video` });

const videoWorker = new Worker(
  "video-generation",
  async (job: Job) => {
    const { videoId, code, sceneName, transcript } = job.data;
    const startedAt = Date.now();

    console.log("[worker] job received", {
      jobId: job.id,
      videoId,
      attempt: job.attemptsMade + 1,
      sceneName,
      codeChars: typeof code === "string" ? code.length : 0,
      transcriptChars: typeof transcript === "string" ? transcript.length : 0,
    });

    await db
      .update(videos)
      .set({
        status: "generating",
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));

    const url = `${rendererUrl}/generate-video`;
    console.log("[worker] calling renderer", { jobId: job.id, videoId, url });

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          scene_name: sceneName,
          transcript,
        }),
        signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[worker] renderer fetch failed", {
        jobId: job.id,
        videoId,
        url,
        elapsedMs: Date.now() - startedAt,
        error: message,
      });
      throw new Error(`Renderer fetch failed: ${message}`);
    }

    const elapsedMs = Date.now() - startedAt;
    const rawText = await response.text();
    console.log("[worker] renderer responded", {
      jobId: job.id,
      videoId,
      status: response.status,
      ok: response.ok,
      elapsedMs,
      bodyChars: rawText.length,
    });

    if (!response.ok) {
      let errorData: Record<string, unknown> = { raw: rawText };
      try {
        errorData = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        // keep raw body
      }

      console.error("[worker] renderer error payload", {
        jobId: job.id,
        videoId,
        status: response.status,
        errorData,
      });

      let errorMessage =
        errorData.full_traceback ||
        errorData.details ||
        errorData.error_message ||
        errorData.error ||
        errorData.raw ||
        `HTTP ${response.status}: Unknown Error`;

      if (typeof errorMessage === "object") {
        errorMessage = JSON.stringify(errorMessage);
      }

      if (response.status !== 502 && response.status !== 503 && response.status !== 504) {
        throw new UnrecoverableError(String(errorMessage));
      }

      throw new Error(`Network failure: ${errorMessage}`);
    }

    try {
      return JSON.parse(rawText);
    } catch {
      throw new UnrecoverableError(`Renderer returned non-JSON success body: ${rawText.slice(0, 500)}`);
    }
  },
  {
    connection: createRedis(),
    concurrency: 2,
  },
);

videoWorker.on("ready", () => console.log("[worker] bullmq ready, waiting for jobs"));
videoWorker.on("error", (error) => console.error("[worker] bullmq error", error.message));
videoWorker.on("stalled", (jobId) => console.error("[worker] job stalled", { jobId }));

videoWorker.on("completed", async (job, result) => {
  console.log("[worker] job completed", {
    jobId: job.id,
    videoId: job.data.videoId,
    videoUrl: result?.video_url,
    thumbnailUrl: result?.thumbnail_url,
    fileSize: result?.file_size,
  });

  await db
    .update(videos)
    .set({
      status: "ready",
      url: result.video_url,
      thumbnail: result.thumbnail_url,
      filesize: result.file_size,
      updatedAt: new Date(),
    })
    .where(eq(videos.id, job.data.videoId));
});

videoWorker.on("failed", async (job, err) => {
  console.error("[worker] job failed", {
    jobId: job?.id,
    videoId: job?.data?.videoId,
    error: err.message,
  });

  if (job?.data.videoId) {
    await db
      .update(videos)
      .set({
        status: "failed",
        errorTraceback: err.message,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, job.data.videoId));
  }
});

async function shutdown() {
  console.log("[worker] shutting down");
  await videoWorker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[worker] foldex video worker is running");
