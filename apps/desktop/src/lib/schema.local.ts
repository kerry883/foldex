import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

const generateId = () => crypto.randomUUID();

export const folders = sqliteTable("folders", {
    id: text("id").primaryKey().$defaultFn(generateId),
    userId: text("userId"), // Removed notNull() for guest users
    name: text("name").notNull(),
    parentId: text("parentId"), 
    isPinned: integer("isPinned", { mode: "boolean" }).default(false).notNull(),
    color: text("color").default("default").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
    folderUserIdx: index("folders_user_id_idx").on(table.userId),
}));

export const notes = sqliteTable("notes", {
    id: text("id").primaryKey().$defaultFn(generateId),
    userId: text("userId"), // Removed notNull() for guest users
    folderId: text("folderId").references(() => folders.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("untitled"),
    content: text("content", { mode: "json" }), 
    isPinned: integer("isPinned", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
    notesUserIdx: index("notes_user_id_idx").on(table.userId),
    notesFolderIdx: index("notes_folder_id_idx").on(table.folderId),
}));

export const templates = sqliteTable("templates", {
    id: text("id").primaryKey().$defaultFn(generateId),
    creatorId: text("creatorId"), // Removed notNull() for guest users
    name: text("name").notNull(),
    description: text("description"),
    schemapayload: text("schemapayload", { mode: "json" }).notNull(),
    ispublic: integer("ispublic", { mode: "boolean" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
    templatesCreatorIdx: index("templates_creator_id_idx").on(table.creatorId),
}));

export const chats = sqliteTable("chats", {
    id: text("id").primaryKey().$defaultFn(generateId),
    userId: text("userId"), // Removed notNull() for guest users
    title: text("title").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
    chatsUserIdx: index("chats_user_id_idx").on(table.userId),
    chatsUpdateAtIdx:index("chats_updatedAt_id_idx").on(table.updatedAt)
}));

export const messages = sqliteTable("messages", {
    id: text("id").primaryKey().$defaultFn(generateId),
    chatId: text("chatId").notNull().references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    parts: text("parts", { mode: "json" }).notNull(),
}, (table) => ({
    messageChatsIdx: index("message_chats_id_idx").on(table.chatId),
}));

// Add to schema.local.ts
export const apiKeyMeta = sqliteTable("api_key_meta", {
    id: text("id").primaryKey().$defaultFn(generateId),
    provider: text("provider").notNull(),          // "openai" | "anthropic" | etc.
    displayHint: text("displayHint").notNull(),    // "sk-...ab3f"
    isValid: integer("isValid", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});
// Add to schema.local.ts
export const userSettings = sqliteTable("user_settings", {
    id: text("id").primaryKey().$defaultFn(generateId),
    userId: text("userId"),  // nullable for guest
    systemPrompt: text("systemPrompt"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

// Add to schema.local.ts
export const localUser = sqliteTable("local_user", {
    id: text("id").primaryKey(),              // Same ID as the cloud user
    name: text("name").notNull(),
    email: text("email").notNull(),
    image: text("image"),
    isLoggedIn: integer("isLoggedIn", { mode: "boolean" }).default(false).notNull(),
    lastSyncAt: integer("lastSyncAt", { mode: "timestamp_ms" }),  // For sync engine
});