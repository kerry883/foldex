import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db";

export async function runMigrations() {
  const migrationsFolder = join(import.meta.dir, "../../drizzle");
  await migrate(db, { migrationsFolder });
}
