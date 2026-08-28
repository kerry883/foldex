import { Job, UnrecoverableError, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { videos } from "./db/schema";
import { db } from "./lib/db";
import { runMigrations } from "./lib/migrate";
import { createRedis } from "./lib/redis";

await runMigrations();

const rendererUrl = (process.env.MANIM_FLASK_URL ?? "http://localhost:5001").replace(
  /\/$/,
  "",
);

const videoWorker = new Worker(
  "video-generation",
  async (job: Job) => {
    const { videoId, code, sceneName, transcript } = job.data;

    await db
      .update(videos)
      .set({
        status: "generating",
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));

    console.log(`[Job ${job.id}] Starting render for video ${videoId}`);

    const response = await fetch(`${rendererUrl}/generate-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        scene_name: sceneName,
        transcript,
      }),
    });

    if (!response.ok) {
      let rawText = "";
      let errorData: Record<string, unknown> = {};

      try {
        rawText = await response.text();
        errorData = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        errorData = { raw: rawText };
      }

      console.log(`[Job ${job.id}] Error payload from renderer:`, errorData);

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

    return response.json();
  },
  {
    connection: createRedis(),
    concurrency: 2,
  },
);

videoWorker.on("completed", async (job, result) => {
  console.log(`[Job ${job.id}] Completed! URL: ${result.video_url}`);

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
  console.error(`[Job ${job?.id}] Failed: ${err.message}`);

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
  console.log("Shutting down video worker...");
  await videoWorker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("foldex video worker is running");
