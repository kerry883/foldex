import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";

// Copied from Better Auth docs: https://better-auth.com/docs/concepts/database#core-schema
export const user = pgTable("user", {
	id: t.text("id").primaryKey(),
	name: t.text("name").notNull(),
	email: t.varchar("email", { length: 255 }).notNull().unique(),
	emailVerified: t.boolean("email_verified").notNull(),
	image: t.text("image"),
	createdAt: t.timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
	updatedAt: t.timestamp("updated_at", { precision: 6, withTimezone: true }).notNull(),
});

export const session = pgTable("session", {
	id: t.text("id").primaryKey(),
	userId: t.text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	token: t.varchar("token", { length: 255 }).notNull().unique(),
	expiresAt: t.timestamp("expires_at", { precision: 6, withTimezone: true }).notNull(),
	ipAddress: t.text("ip_address"),
	userAgent: t.text("user_agent"),
	createdAt: t.timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
	updatedAt: t.timestamp("updated_at", { precision: 6, withTimezone: true }).notNull(),
});

export const account = pgTable("account", {
	id: t.text("id").primaryKey(),
	userId: t.text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	accountId: t.text("account_id").notNull(),
	providerId: t.text("provider_id").notNull(),
	accessToken: t.text("access_token"),
	refreshToken: t.text("refresh_token"),
	accessTokenExpiresAt: t.timestamp("access_token_expires_at", { precision: 6, withTimezone: true }),
	refreshTokenExpiresAt: t.timestamp("refresh_token_expires_at", { precision: 6, withTimezone: true }),
	scope: t.text("scope"),
	idToken: t.text("id_token"),
	password: t.text("password"),
	createdAt: t.timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
	updatedAt: t.timestamp("updated_at", { precision: 6, withTimezone: true }).notNull(),
});

export const verification = pgTable("verification", {
	id: t.text("id").primaryKey(),
	identifier: t.text("identifier").notNull(),
	value: t.text("value").notNull(),
	expiresAt: t.timestamp("expires_at", { precision: 6, withTimezone: true }).notNull(),
	createdAt: t.timestamp("created_at", { precision: 6, withTimezone: true }).notNull(),
	updatedAt: t.timestamp("updated_at", { precision: 6, withTimezone: true }).notNull(),
});

export const videos = pgTable("videos", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("userId").references(() => user.id, { onDelete: "set null" }),
    // Local desktop folder id — no cloud folders table
    folderId: uuid("folderId"),
    title: text("title"),
    description: text("description"),
    transcript: text("transcript"),
    url: text("url"),
    filesize: integer("filesize"),
    thumbnail: text("thumbnail"),
    prompt: text("prompt"),
    isPublic: boolean("isPublic").default(true),
    status: text("status", { enum: ["queued","generating", "ready", "failed"] }).notNull().default("queued"),
    sources: jsonb("sources"),
    creatorname: text("creatorname"),
    creatorprofile: text("creatorprofile"),
    code: text("code"),
    model: text("model"),
    tags: jsonb("tags"),
    errorTraceback: text("error_traceback"),
    likes: integer("likes").default(0),
    dislikes: integer("dislikes").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
    videosUserIdx: index("videos_user_id_idx").on(table.userId),
    videosFolderIdx: index("videos_folder_id_idx").on(table.folderId),
    videosPublicIdx: index("videos_public_idx").on(table.isPublic),
    videosTitleIdx: index("videos_title_idx").on(table.title),
    videosUserFolderIdx: index("videos_user_folder_idx").on(table.userId, table.folderId),
}));

export const videoFeedback = pgTable("video_feedback", {
    id: uuid("id").defaultRandom().primaryKey(),
    videoId: uuid("videoId").notNull().references(() => videos.id, { onDelete: "cascade" }),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["like", "dislike"] }).notNull(),
    tags: jsonb("tags"),
    comment: text("comment"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
    feedbackVideoIdx: index("feedback_video_id_idx").on(table.videoId),
    feedbackUserVideoIdx: index("feedback_user_video_idx").on(table.userId, table.videoId),
}));
