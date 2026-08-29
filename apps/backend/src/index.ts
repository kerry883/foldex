import { runMigrations } from "./lib/migrate";
import app from "./app";

console.log("[api] starting", {
  port: Number(process.env.PORT) || 3000,
  frontendUrl: process.env.FRONTEND_URL ?? "(unset)",
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "(unset)",
  manimFlaskUrl: process.env.MANIM_FLASK_URL ?? "(unset, worker-only)",
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  redisConfigured: Boolean(process.env.REDIS_URL),
});

try {
  await runMigrations();
  console.log("[api] migrations complete");
} catch (error) {
  console.error("[api] migrations failed", error);
  throw error;
}

export default {
  port: Number(process.env.PORT) || 3000,
  hostname: "0.0.0.0",
  fetch: app.fetch,
  idleTimeout: 255,
};
