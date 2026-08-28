import { Context } from "hono"
import { db } from "../lib/db";
import { videos, videoFeedback } from "../db/schema";
import { videoQueue } from "../lib/video-worker";
import z from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { generateManimCode, fixManimCode } from "../lib/manim-agent";
import { getDecryptedKey } from "./apikeycontroller";
import { getProviderInstance } from "../lib/ai-providers";

const DAILY_VIDEO_LIMIT = 5;

// ============================================
// RATE LIMIT CHECK
// ============================================
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(videos)
        .where(and(
            eq(videos.userId, userId),
            gte(videos.createdAt, twentyFourHoursAgo),
            eq(videos.status, "ready")
        ));
    const count = result?.count ?? 0;
    return { allowed: count < DAILY_VIDEO_LIMIT, remaining: Math.max(0, DAILY_VIDEO_LIMIT - count) };
}

// ============================================
// GENERATE VIDEO (receives pre-generated code — for desktop)
// ============================================
export const generatevideo = async(c:Context)=>{
    const user = c.get("user");
    const body = await c.req.json();

    if(!body.code || !body.sceneName || !body.title) return c.json({error:"code , sceneName and title are required"},400)

    // Rate limit
    const { allowed, remaining } = await checkRateLimit(user.id);
    if (!allowed) return c.json({ error: "Daily video limit reached (5/day during beta)", remaining: 0 }, 429);
    
    const [video] = await db.insert(videos).values({
        userId:user.id,
        folderId:body.folderId ?? null,
        creatorname:user.name,
        creatorprofile:user.image,
        title:body.title,
        code:body.code,
        description:body.description,
        transcript:body.transcript,
        model: body.model,
        tags: body.tags,
        status:"queued",     
        prompt:body.prompt,
        isPublic:true       
    }).returning();

    await videoQueue.add('render-job', {
        videoId: video.id,
        code: body.code,
        sceneName: body.sceneName,
        transcript:body.transcript,
        retryCount: 0,
    }, {
        attempts: 3, 
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
    return c.json({ success: true, videoId: video.id, remaining: remaining - 1 }, 202);
}

// ============================================
// GENERATE FROM PROMPT (AI generates code server-side — for web)
// ============================================
export const generateFromPrompt = async (c: Context) => {
    const user = c.get("user");
    const body = await c.req.json();

    if (!body.prompt || !body.model) return c.json({ error: "prompt and model are required" }, 400);

    // Rate limit
    const { allowed, remaining } = await checkRateLimit(user.id);
    if (!allowed) return c.json({ error: "Daily video limit reached (5/day during beta)", remaining: 0 }, 429);

    try {
        // Get the user's decrypted API key for the model's provider
        const provider = getProviderFromModelId(body.model);
        if (!provider) return c.json({ error: "Unknown model provider" }, 400);

        const apiKey = await getDecryptedKey(user.id, provider);
        if (!apiKey) return c.json({ error: `No API key found for ${provider}. Add one in Settings.` }, 400);

        const modelInstance = getProviderInstance(provider, apiKey, body.model);

        // Generate Manim code using the AI agent
        const manimResult = await generateManimCode({
            prompt: body.prompt,
            fileContext: body.fileContext,
            model: modelInstance,
        });

        // Insert video row
        const [video] = await db.insert(videos).values({
            userId: user.id,
            folderId: body.folderId ?? null,
            creatorname: user.name,
            creatorprofile: user.image,
            title: manimResult.title,
            code: manimResult.code,
            description: manimResult.description,
            transcript: manimResult.transcript,
            model: body.model,
            tags: manimResult.tags,
            status: "queued",
            prompt: body.prompt,
            isPublic: true,
        }).returning();

        // Queue the render job
        await videoQueue.add('render-job', {
            videoId: video.id,
            code: manimResult.code,
            sceneName: manimResult.sceneName,
            transcript: manimResult.transcript,
            retryCount: 0,
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
        });

        return c.json({ success: true, videoId: video.id, remaining: remaining - 1 }, 202);
    } catch (error) {
        console.error("[generateFromPrompt] Error:", error);
        return c.json({ error: `Failed to generate video: ${error}` }, 500);
    }
};

// ============================================
// GET VIDEO
// ============================================
export const getvideo = async(c:Context)=>{
    const user = c.get("user");
    const id = c.req.param("id");

    if(!id) return c.json({error:"video id is required"});
    const safeParse = z.uuid().safeParse(id);
    if(!safeParse.success) return c.json({error:"video id is invalid "},500)

    const [video] = await db.select().from(videos).where(eq(videos.id,id))

    if(!video) return c.json({error:"video not found"},404)

    return c.json(video,200) 
}

// ============================================
// GET PUBLIC VIDEOS
// ============================================
export const getpublicvideos = async(c:Context)=>{
    const publicvideos = await db.select().from(videos).where(eq(videos.status,"ready")).orderBy(desc(videos.createdAt))

    return c.json(publicvideos,200)
}

// ============================================
// GET MY VIDEOS
// ============================================
export const getmyvideos = async(c:Context)=>{
    const user = c.get("user");
    const folderId = c.req.query("folderId");

    let myvideos;
    if (folderId) {
        myvideos = await db.select().from(videos)
            .where(and(eq(videos.userId, user.id), eq(videos.folderId, folderId)))
            .orderBy(desc(videos.createdAt));
    } else {
        myvideos = await db.select().from(videos)
            .where(eq(videos.userId, user.id))
            .orderBy(desc(videos.createdAt));
    }

    return c.json(myvideos,200)
}

// ============================================
// DELETE VIDEO (soft — set userId to null)
// ============================================
export const deletevideo = async(c:Context)=>{
    const user = c.get("user");
    const id = c.req.param("id");

    if(!id) return c.json({error:"video id is required"});
    const safeParse = z.uuid().safeParse(id);
    if(!safeParse.success) return c.json({error:"video id is invalid "},500)

    const [video] = await db.select().from(videos).where(eq(videos.id,id));

    if(!video) return c.json({error:"video not found"},404);
    if(video.userId !== user.id) return c.json({error:"you are not authorized to delete this video"},403);

    if(video.status === "ready"){
    await db.update(videos).set({
        userId:null,
        isPublic:true,
        updatedAt:new Date(),
    }).where(eq(videos.id,id));
    }
    else{
        await videoQueue.remove(id);
        await db.delete(videos).where(eq(videos.id,id));
    }

    return c.json({success:true},200)
}

// ============================================
// UPDATE VIDEO
// ============================================
export const updatevideo = async(c:Context)=>{
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();

    if(!id) return c.json({error:"video id is required"});
    const safeParse = z.uuid().safeParse(id);
    if(!safeParse.success) return c.json({error:"video id is invalid "},500)

    const [video] = await db.select().from(videos).where(eq(videos.id,id));

    if(!video) return c.json({error:"video not found"},404);
    if(video.userId !== user.id) return c.json({error:"you are not authorized to update this video"},403);

    await db.update(videos).set({
        folderId:body.folderId !== undefined ? body.folderId : video.folderId,
        isPublic:body.isPublic !== undefined ? body.isPublic : video.isPublic,
        updatedAt:new Date(),
    }).where(eq(videos.id,id));
    return c.json({success:true},200)
}

// ============================================
// SUBMIT FEEDBACK (like/dislike with optional tags)
// ============================================
export const submitFeedback = async (c: Context) => {
    const user = c.get("user");
    const videoId = c.req.param("id");
    const body = await c.req.json();

    if (!videoId) return c.json({ error: "video id is required" }, 400);
    const safeParse = z.uuid().safeParse(videoId);
    if (!safeParse.success) return c.json({ error: "invalid video id" }, 400);

    const feedbackType = body.type; // 'like' | 'dislike'
    if (!feedbackType || !['like', 'dislike'].includes(feedbackType)) {
        return c.json({ error: "type must be 'like' or 'dislike'" }, 400);
    }

    // Check if user already voted
    const [existing] = await db.select().from(videoFeedback)
        .where(and(eq(videoFeedback.videoId, videoId), eq(videoFeedback.userId, user.id)));

    if (existing) {
        if (existing.type === feedbackType) {
            // Same vote → remove it (toggle off)
            await db.delete(videoFeedback).where(eq(videoFeedback.id, existing.id));

            // Decrement count
            if (feedbackType === 'like') {
                await db.update(videos).set({ likes: sql`GREATEST(0, ${videos.likes} - 1)` }).where(eq(videos.id, videoId));
            } else {
                await db.update(videos).set({ dislikes: sql`GREATEST(0, ${videos.dislikes} - 1)` }).where(eq(videos.id, videoId));
            }

            return c.json({ success: true, action: 'removed', currentVote: null }, 200);
        } else {
            // Different vote → switch
            await db.update(videoFeedback).set({
                type: feedbackType as "like" | "dislike",
                tags: body.tags ?? null,
                createdAt: new Date(),
            }).where(eq(videoFeedback.id, existing.id));

            // Adjust counts
            if (feedbackType === 'like') {
                await db.update(videos).set({
                    likes: sql`${videos.likes} + 1`,
                    dislikes: sql`GREATEST(0, ${videos.dislikes} - 1)`,
                }).where(eq(videos.id, videoId));
            } else {
                await db.update(videos).set({
                    dislikes: sql`${videos.dislikes} + 1`,
                    likes: sql`GREATEST(0, ${videos.likes} - 1)`,
                }).where(eq(videos.id, videoId));
            }

            return c.json({ success: true, action: 'switched', currentVote: feedbackType }, 200);
        }
    } else {
        // New vote
        await db.insert(videoFeedback).values({
            videoId,
            userId: user.id,
            type: feedbackType as "like" | "dislike",
            tags: body.tags ?? null,
        });

        if (feedbackType === 'like') {
            await db.update(videos).set({ likes: sql`${videos.likes} + 1` }).where(eq(videos.id, videoId));
        } else {
            await db.update(videos).set({ dislikes: sql`${videos.dislikes} + 1` }).where(eq(videos.id, videoId));
        }

        return c.json({ success: true, action: 'created', currentVote: feedbackType }, 200);
    }
};

// ============================================
// GET USER FEEDBACK FOR A VIDEO
// ============================================
export const getUserFeedback = async (c: Context) => {
    const user = c.get("user");
    const videoId = c.req.param("id");

    if (!videoId) return c.json({ error: "video id is required" }, 400);

    const [existing] = await db.select().from(videoFeedback)
        .where(and(eq(videoFeedback.videoId, videoId), eq(videoFeedback.userId, user.id)));

    return c.json({
        currentVote: existing?.type ?? null,
        tags: existing?.tags ?? null,
    }, 200);
};

// ============================================
// HELPER: extract provider from model ID
// ============================================
function getProviderFromModelId(modelId: string): string | null {
    if (modelId.startsWith("gpt-")) return "openai";
    if (modelId.startsWith("claude-")) return "anthropic";
    if (modelId.startsWith("gemini-")) return "google";
    if (modelId.startsWith("deepseek-")) return "deepseek";
    if (modelId.startsWith("grok-")) return "xai";
    if (modelId.startsWith("kimi-")) return "moonshot";
    return null;
}

// ============================================
// RETRY VIDEO (server-side AI code fix — for web users)
// ============================================
export const retryVideo = async (c: Context) => {
    const user = c.get("user");
    const videoId = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));

    if (!videoId) return c.json({ error: "video id is required" }, 400);
    const safeParse = z.uuid().safeParse(videoId);
    if (!safeParse.success) return c.json({ error: "invalid video id" }, 400);

    const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
    if (!video) return c.json({ error: "video not found" }, 404);
    if (video.userId !== user.id) return c.json({ error: "not authorized" }, 403);
    if (video.status !== "failed") return c.json({ error: "video is not in failed state" }, 400);
    if (!video.code || !video.errorTraceback) return c.json({ error: "missing code or error data" }, 400);

    try {
        let fixedCode = body.code;
        let fixedSceneName = body.sceneName;
        let explanation = "Fixed locally by desktop app";

        // If no code is provided in body, we do the AI fix server-side (web flow)
        if (!fixedCode) {
            // Get model — use the same model that generated the original, or fall back
            const modelId = video.model || "gemini-3-flash-preview";
            const provider = getProviderFromModelId(modelId);
            if (!provider) return c.json({ error: "unknown model provider" }, 400);

            const apiKey = await getDecryptedKey(user.id, provider);
            if (!apiKey) return c.json({ error: `No API key for ${provider}` }, 400);

            const modelInstance = getProviderInstance(provider, apiKey, modelId);

            // Parse error traceback — handle both string and object
            const errorStr = typeof video.errorTraceback === "object"
                ? JSON.stringify(video.errorTraceback)
                : video.errorTraceback;

            // Fix the code
            const fixed = await fixManimCode({
                originalCode: video.code,
                errorTraceback: errorStr,
                model: modelInstance,
            });

            fixedCode = fixed.code;
            fixedSceneName = fixed.sceneName;
            explanation = fixed.explanation;
        }

        // Update the existing video row instead of creating a new one
        await db.update(videos).set({
            code: fixedCode,
            status: "queued",
            errorTraceback: null,
            updatedAt: new Date()
        }).where(eq(videos.id, videoId));

        // Queue render
        await videoQueue.add('render-job', {
            videoId: videoId,
            code: fixedCode,
            sceneName: fixedSceneName || "GeneratedScene", // fallback to GeneratedScene if empty
            transcript: video.transcript,
            retryCount: 0,
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
        });

        return c.json({ success: true, videoId, explanation }, 202);
    } catch (error) {
        console.error("[retryVideo] Error:", error);
        return c.json({ error: `Retry failed: ${error}` }, 500);
    }
};
