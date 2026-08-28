import { Queue, Worker, Job, UnrecoverableError } from 'bullmq';
import IORedis from 'ioredis';
import { db } from './db';
import { videos } from '../db/schema';
import { eq } from 'drizzle-orm';


const connection = new IORedis(process.env.REDIS_URL ||"redis://localhost:6379",{
    maxRetriesPerRequest: null,})

export const videoQueue = new Queue('video-generation',{connection});

export const videoWorker = new Worker('video-generation',async(job:Job)=>{
    const {videoId,code,sceneName,transcript}=job.data;

    await db.update(videos).set({
        status:"generating",
        updatedAt: new Date(),
    }).where(eq(videos.id,videoId));

    console.log(`[Job ${job.id}] Starting render for video ${videoId} on Cloud Run...`);

    const response = await fetch(process.env.MANIM_FLASK_URL+'/generate-video',{
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:JSON.stringify({
           code, scene_name: sceneName, transcript
        })
    });

    if (!response.ok) {
        let rawText = '';
        let errorData: any = {};
        
        // 1. Safely try to parse JSON, fallback to raw text if Cloud Run returns an HTML error page
        try {
            rawText = await response.text();
            errorData = JSON.parse(rawText);
        } catch (e) {
            errorData = { raw: rawText };
        }

        console.log(`[Job ${job.id}] Error Payload from Flask:`, errorData);

        // 2. Cascade through all possible keys Flask might use to send an error
        let errorMessage = errorData.full_traceback 
            || errorData.details 
            || errorData.error_message 
            || errorData.error 
            || errorData.raw 
            || `HTTP ${response.status}: Unknown Error`;

        // If Pydantic validation failed, 'details' is an array/object. Stringify it for the DB.
        if (typeof errorMessage === 'object') {
            errorMessage = JSON.stringify(errorMessage);
        }

        // 3. Determine if the error should go to the LLM or trigger a network retry
        // 502, 503, 504 are Cloud Run network/timeout errors (safe to retry)
        // Everything else (400, 500) is likely a code/logic error (Unrecoverable -> send to LLM)
        if (response.status !== 502 && response.status !== 503 && response.status !== 504) {
            throw new UnrecoverableError(errorMessage);
        }

        throw new Error(`Network failure: ${errorMessage}`);
    }
    const data = await response.json();
    return data;
},{
    connection,
    concurrency:10
});

videoWorker.on('completed',async(job,result)=>{
    console.log(`[Job ${job.id}] Completed! URL: ${result.video_url}`);

    await db.update(videos).set({
        status: 'ready',
        url: result.video_url,
        thumbnail: result.thumbnail_url,
        filesize: result.file_size,
        updatedAt: new Date(),
    }).where(eq(videos.id, job.data.videoId));
});

videoWorker.on('failed', async (job, err) => {
    console.error(`[Job ${job?.id}] Failed: ${err.message}`);
    
    if (job && job.data.videoId) {
        // We save the error message/traceback into the  'errorTraceback' column
      
        await db.update(videos).set({
            status: 'failed',
            errorTraceback:err.message,
            updatedAt: new Date(),
        }).where(eq(videos.id, job.data.videoId));
    }
});
