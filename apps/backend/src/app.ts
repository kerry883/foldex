import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./lib/auth";
import type { Appvariables } from "./env";
import videoRouter from "./routes/videoroute";

const app = new Hono<{ Variables: Appvariables }>()
  .use("*", logger())
  .use(
    "*",
    cors({
      origin: [
        process.env.FRONTEND_URL ?? "http://localhost:3001",
        "http://localhost:3000",
        "http://tauri.localhost",
        "tauri://localhost",
      ],
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  )
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .get("/", (c) => c.text("foldex backend is running !"))
  .route("/api/videos", videoRouter);

export type AppType = typeof app;
export default app;
