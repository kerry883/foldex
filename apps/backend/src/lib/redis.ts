import IORedis from "ioredis";

export function createRedis() {
  return new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    family: 0,
  });
}
