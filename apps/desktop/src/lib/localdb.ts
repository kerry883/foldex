import Database from "@tauri-apps/plugin-sql";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema.local"; 

type LocalDatabase = ReturnType<typeof drizzle<typeof schema>>
let localDbInstance: LocalDatabase | null = null;

export const getLocalDb = async () => {
  // If we already connected, reuse the connection
  if (localDbInstance) return localDbInstance;

  // 1. Tell Tauri to create or open a file named 'foldex.db' on the hard drive
  const dbName = import.meta.env.DEV
    ? "sqlite:foldex_dev.db" 
    : "sqlite:foldex.db";
  const tauriDb = await Database.load(dbName);

  // 2. Create the proxy so Drizzle can talk to Tauri
  localDbInstance = drizzle(
    async (sql, params, method) => {
      try {
        if (method === "run") {
          await tauriDb.execute(sql, params);
          return { rows: [] };
        } else {
          const result = await tauriDb.select<Record<string, any>>(sql, params);
          return { rows: result.map((row: any) => Object.values(row)) };
        }
      } catch (e: any) {
        console.error("Local DB Error:", e);
        throw e; // Let the caller handle it
      }
    },
    { schema }
  );

  // 3. Initialize the tables — each CREATE TABLE must be a separate execute() call
  //    because tauri-plugin-sql does NOT support multi-statement execution
  await tauriDb.execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT NOT NULL,
      parentId TEXT,
      isPinned INTEGER DEFAULT 0 NOT NULL,
      color TEXT DEFAULT 'default' NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  await tauriDb.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      userId TEXT,
      folderId TEXT REFERENCES folders(id) ON DELETE CASCADE,
      title TEXT DEFAULT 'untitled' NOT NULL,
      content TEXT,
      isPinned INTEGER DEFAULT 0 NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  await tauriDb.execute(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      userId TEXT,
      title TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  await tauriDb.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatId TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      parts TEXT NOT NULL
    )
  `);

  await tauriDb.execute(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      creatorId TEXT,
      name TEXT NOT NULL,
      description TEXT,
      schemapayload TEXT NOT NULL,
      ispublic INTEGER DEFAULT 0 NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  await tauriDb.execute(`
    CREATE TABLE IF NOT EXISTS api_key_meta (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      displayHint TEXT NOT NULL,
      isValid INTEGER DEFAULT 1 NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  await tauriDb.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      userId TEXT,
      systemPrompt TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  await tauriDb.execute(`
    CREATE TABLE IF NOT EXISTS local_user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      image TEXT,
      isLoggedIn INTEGER DEFAULT 0 NOT NULL,
      lastSyncAt INTEGER
    )
  `);

  // Create indexes separately
  await tauriDb.execute(`CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders(userId)`);
  await tauriDb.execute(`CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(userId)`);
  await tauriDb.execute(`CREATE INDEX IF NOT EXISTS notes_folder_id_idx ON notes(folderId)`);
  await tauriDb.execute(`CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats(userId)`);
  await tauriDb.execute(`CREATE INDEX IF NOT EXISTS chats_updatedAt_id_idx ON chats(updatedAt)`);
  await tauriDb.execute(`CREATE INDEX IF NOT EXISTS message_chats_id_idx ON messages(chatId)`);
  await tauriDb.execute(`CREATE INDEX IF NOT EXISTS templates_creator_id_idx ON templates(creatorId)`);

  return localDbInstance;
};