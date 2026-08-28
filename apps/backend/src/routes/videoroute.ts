import { Hono } from "hono";
import { requireauth } from "../middleware/requireauth";
import { Appvariables, db } from "..";
import { deletevideo, generateFromPrompt, generatevideo, getmyvideos, getpublicvideos, getvideo, getUserFeedback, retryVideo, submitFeedback, updatevideo } from "../controllers/videocontroller";
import { videos } from "../db/schema";
import { eq } from "drizzle-orm";
import z from "zod";

const videoRouter = new Hono<{ Variables: Appvariables }>();

// ─── EXACT STRING PATHS ───
videoRouter.get('/', getpublicvideos);
videoRouter.get('/my', requireauth, getmyvideos);
videoRouter.post('/generate', requireauth, generatevideo);
videoRouter.post('/generate-from-prompt', requireauth, generateFromPrompt);

// ─── PATHS WITH VARIABLES ───
videoRouter.post('/:id/retry', requireauth, retryVideo);
videoRouter.put('/:id', requireauth, updatevideo);
videoRouter.delete('/:id', requireauth, deletevideo);

// Feedback endpoints
videoRouter.post('/:id/feedback', requireauth, submitFeedback);
videoRouter.get('/:id/feedback', requireauth, getUserFeedback);

// Status polling endpoint (public)
videoRouter.get('/:id/getstatus', async (c) => {
    const id = c.req.param("id")
    if (!id) return c.json({ error: "id is required" }, 400)
    const safeParse = z.uuid().safeParse(id)
    if (!safeParse.success) return c.json({ error: "invalid id" }, 400)

    const [video] = await db.select().from(videos).where(eq(videos.id, id))
    if (!video) return c.json({ error: "video not found" }, 404)
    return c.json({
        id: video.id,
        status: video.status,
        videoUrl: video.url,
        thumbnail: video.thumbnail,
        error: video.status === "failed" ? video.errorTraceback : "",
    })
})

// Get video endpoint (public)
// Must be last to avoid catching exact routes like /my
videoRouter.get('/:id', getvideo);

export default videoRouter;
