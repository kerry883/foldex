import { runMigrations } from "./lib/migrate";
import app from "./app";

await runMigrations();

export default {
  port: Number(process.env.PORT) || 3000,
  hostname: "0.0.0.0",
  fetch: app.fetch,
  idleTimeout: 255,
};
