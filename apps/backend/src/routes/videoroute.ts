import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import { requireauth } from "../middleware/requireauth";
import type { Appvariables } from "../env";
import {
  createVideoBody,
  feedbackBody,
  myVideosQuery,
  retryVideoBody,
  updateVideoBody,
  videoIdParam,
} from "../lib/video-schema";
import {
  deletevideo,
  generatevideo,
  getmyvideos,
  getpublicvideos,
  getUserFeedback,
  getvideo,
  getvideostatus,
  retryVideo,
  submitFeedback,
  updatevideo,
} from "../controllers/videocontroller";

const factory = createFactory<{ Variables: Appvariables }>();

const videoRouter = new Hono<{ Variables: Appvariables }>()
  .get("/", (c) => getpublicvideos(c))
  .get(
    "/my",
    ...factory.createHandlers(requireauth, zValidator("query", myVideosQuery), (c) =>
      getmyvideos(c),
    ),
  )
  .post(
    "/generate",
    ...factory.createHandlers(requireauth, zValidator("json", createVideoBody), (c) =>
      generatevideo(c),
    ),
  )
  .post(
    "/:id/retry",
    ...factory.createHandlers(
      requireauth,
      zValidator("param", videoIdParam),
      zValidator("json", retryVideoBody),
      (c) => retryVideo(c),
    ),
  )
  .put(
    "/:id",
    ...factory.createHandlers(
      requireauth,
      zValidator("param", videoIdParam),
      zValidator("json", updateVideoBody),
      (c) => updatevideo(c),
    ),
  )
  .delete(
    "/:id",
    ...factory.createHandlers(requireauth, zValidator("param", videoIdParam), (c) =>
      deletevideo(c),
    ),
  )
  .post(
    "/:id/feedback",
    ...factory.createHandlers(
      requireauth,
      zValidator("param", videoIdParam),
      zValidator("json", feedbackBody),
      (c) => submitFeedback(c),
    ),
  )
  .get(
    "/:id/feedback",
    ...factory.createHandlers(requireauth, zValidator("param", videoIdParam), (c) =>
      getUserFeedback(c),
    ),
  )
  .get(
    "/:id/getstatus",
    ...factory.createHandlers(zValidator("param", videoIdParam), (c) => getvideostatus(c)),
  )
  .get(
    "/:id",
    ...factory.createHandlers(zValidator("param", videoIdParam), (c) => getvideo(c)),
  );

export default videoRouter;
