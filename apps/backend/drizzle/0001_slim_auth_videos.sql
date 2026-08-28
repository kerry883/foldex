DROP TABLE IF EXISTS "messages" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "chats" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "notes" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "templates" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "api_keys" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "user_settings" CASCADE;--> statement-breakpoint
ALTER TABLE IF EXISTS "videos" DROP CONSTRAINT IF EXISTS "videos_folderId_folders_id_fk";--> statement-breakpoint
DROP TABLE IF EXISTS "folders" CASCADE;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text,
	"folderId" uuid,
	"title" text,
	"description" text,
	"transcript" text,
	"url" text,
	"filesize" integer,
	"thumbnail" text,
	"prompt" text,
	"isPublic" boolean DEFAULT true,
	"status" text DEFAULT 'queued' NOT NULL,
	"sources" jsonb,
	"creatorname" text,
	"creatorprofile" text,
	"code" text,
	"model" text,
	"tags" jsonb,
	"error_traceback" text,
	"likes" integer DEFAULT 0,
	"dislikes" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"videoId" uuid NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"tags" jsonb,
	"comment" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "videos" ADD CONSTRAINT "videos_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_feedback" ADD CONSTRAINT "video_feedback_videoId_videos_id_fk" FOREIGN KEY ("videoId") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_feedback" ADD CONSTRAINT "video_feedback_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "videos_user_id_idx" ON "videos" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "videos_folder_id_idx" ON "videos" USING btree ("folderId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "videos_public_idx" ON "videos" USING btree ("isPublic");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "videos_title_idx" ON "videos" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "videos_user_folder_idx" ON "videos" USING btree ("userId","folderId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_video_id_idx" ON "video_feedback" USING btree ("videoId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_user_video_idx" ON "video_feedback" USING btree ("userId","videoId");
