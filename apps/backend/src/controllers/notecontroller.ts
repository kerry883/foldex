import  { Context } from "hono";
import { db } from "../lib/db";
import { folders, notes } from "../db/schema";
import { and, eq } from "drizzle-orm";
import z from "zod";

/** Extract a plain-text preview (~200 chars) from BlockNote jsonb content */
function extractPreview(content: unknown, maxLength = 200): string | null {
    if (!content || !Array.isArray(content)) return null;
    let text = "";
    const walk = (blocks: any[]) => {
        for (const block of blocks) {
            if (text.length >= maxLength) break;
            // Extract text from inline content
            if (Array.isArray(block.content)) {
                for (const inline of block.content) {
                    if (inline.type === "text" && inline.text) {
                        text += inline.text + " ";
                    }
                }
            }
            // Recurse into children
            if (Array.isArray(block.children) && block.children.length > 0) {
                walk(block.children);
            }
        }
    };
    walk(content);
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

export const getusersnotes = async (c:Context)=>{
    try {
        const user = c.get("user");
        const folderId = c.req.query("folderId");
        let Notes;
        if(folderId){
            Notes = await db.select().from(notes).where(and(eq(notes.userId,user.id),eq(notes.folderId,folderId)))
        }else{
            Notes = await db.select().from(notes).where(eq(notes.userId,user.id))
        }

        //note am ommiting content because we dont want to send large content just for listing the note 
        return c.json(Notes.map(note=>({
            id:note.id,
            title:note.title,
            folderId:note.folderId,
            isPinned:note.isPinned,
            preview: extractPreview(note.content),
            createdAt:note.createdAt,
            updatedAt:note.updatedAt
        })))
    } catch (error) {
        console.log("error in getting users notes",error)
        return c.json({
            success:false,
            error:error,
            message:"error in getting users notes "
        },500)
    } 
}

export const createnote = async (c:Context)=>{
    try {
        const user = c.get("user")
        const body = await c.req.json()

        if(body.folderId){
             const folder = await db.select().from(folders).where(and(eq(folders.id,body.folderId),eq(folders.userId,user.id)));
             //note here we are checking for length because the folder returns an array and if we check !folder it will just pass bringing errors 
             if(folder.length === 0) return c.json({error:"folder not found"},404)
        }
       
        const note = await db.insert(notes).values({
            userId:user.id,
            title:body.title.trim()|| "untitled",
            content:body.content ?? null,
            folderId:body.folderId ?? null,
            isPinned:body.isPinned ?? false,
        }).returning();

        return c.json(note[0],201)
        
    } catch (error) {
        console.log("error in creating a note ",error)
        return c.json({
            success:false,
            error:error,
            message:"error in creating a note "
        },500)
    }
}

export const updatenote = async (c:Context)=>{
    try {
        const user = c.get("user")
        const id = c.req.param("id");
        const body = await c.req.json();
        if (!id) return c.json({error:"note id is required "});
        
        const uuidCheck = z.uuid().safeParse(id);
        if (!uuidCheck.success) return c.json({ error: "Invalid ID format" }, 400);

        const existing = await db.select().from(notes).where(and(eq(notes.id,id),eq(notes.userId,user.id)));
        if(existing.length === 0) return c.json({error:"note not found "},401);

        if(body.folderId){
             const folder = await db.select().from(folders).where(and(eq(folders.id,body.folderId),eq(folders.userId,user.id)));
             if(folder.length === 0) return c.json({error:"folder not found"},404)
        }
        const note = await db.update(notes).set({
            title:body.title?.trim() ?? existing[0].title,
            content:body.content !== undefined ? body.content : existing[0].content,
            folderId:body.folderId !== undefined ? body.folderId :existing[0].folderId,
            isPinned:body.isPinned !== undefined ? body.isPinned : existing[0].isPinned,
            updatedAt: new Date()
        }).where(and(eq(notes.id,id),eq(notes.userId,user.id))).returning()

     return c.json(note[0],201)
        
    } catch (error) {
        console.log("error in updating note ",error)
        return c.json({
            success:false,
            error:error,
            message:"error in updating note "
        },500)        
    }
}


export const getnote = async (c:Context)=>{
    try {
        const user = c.get("user");
        const id = c.req.param("id");
        if (!id) return c.json({error:"note id is required "});
        
        const uuidCheck = z.uuid().safeParse(id);
        if (!uuidCheck.success) return c.json({ error: "Invalid ID format" }, 400);
        const note = await db.select().from(notes).where(and(eq(notes.id,id),eq(notes.userId,user.id)));

        return c.json(note[0],200)
    } catch (error) {
        console.log("error in getting note ",error)
        return c.json({
            success:false,
            error:error,
            message:"error in getting note "
        },500)
    }
}
export const deletenote = async (c:Context)=>{
    try {
        const user = c.get("user");
        const id = c.req.param("id");
        if (!id) return c.json({error:"note id is required "});
        
        const uuidCheck = z.uuid().safeParse(id);
        if (!uuidCheck.success) return c.json({ error: "Invalid ID format" }, 400);

        const existing = await db.select().from(notes).where(and(eq(notes.id,id),eq(notes.userId,user.id)));
        if(existing.length === 0) return c.json({error:"note not found "},401);
         
        await db.delete(notes).where(and(eq(notes.id,id),eq(notes.userId,user.id)))

        return c.json({success:true},200);
    } catch (error) {
        console.log("error in deleting note ",error)
         
        return c.json({
            success:false,
            error:error,
            message:"error in deleting note "
        },500)
    }
}

export const movenote = async (c:Context)=>{
    try {
       const user = c.get("user"); 
        const id = c.req.param("id"); 
        if (!id) return c.json({error:"note id is required "});
        
        const uuidCheck = z.uuid().safeParse(id);
        if (!uuidCheck.success) return c.json({ error: "Invalid ID format" }, 400);
        
        const body = await c.req.json();
        const parsedData = z.object({ folderId: z.uuid().nullable().optional() }).parse(body);

        const existing = await db.select().from(notes).where(
            and(eq(notes.id, id), eq(notes.userId, user.id))
        );
        if (existing.length === 0) return c.json({ error: "note not found" }, 404);

        if (parsedData.folderId) {
            const folder = await db.select().from(folders).where(
                and(eq(folders.id, parsedData.folderId), eq(folders.userId, user.id))
            );
            if (folder.length === 0) return c.json({ error: "folder not found" }, 404);
        }
        
        const updatedNote = await db.update(notes).set({
            folderId: parsedData.folderId ?? null,
            updatedAt: new Date() 
        }).where(and(eq(notes.id, id),eq(notes.userId,user.id))).returning(); 

        return c.json(updatedNote[0], 200);
        
    } catch (error) {
        console.log("error in moving note ",error);
        return c.json({
            success:false,
            error:error,
            message:"error in moving note ",
        },500)
    }
}

