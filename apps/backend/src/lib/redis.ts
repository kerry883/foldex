import IORedis from "ioredis";

export function createRedis() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const client = new IORedis(url, {
    maxRetriesPerRequest: null,
    family: 0,
  });

  client.on("connect", () => console.log("[redis] connected"));
  client.on("ready", () => console.log("[redis] ready"));
  client.on("error", (error) => console.error("[redis] error", error.message));
  client.on("close", () => console.log("[redis] connection closed"));

  return client;
}
