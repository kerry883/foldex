import { Queue } from "bullmq";
import { createRedis } from "./redis";

export const videoQueue = new Queue("video-generation", {
  connection: createRedis(),
});
