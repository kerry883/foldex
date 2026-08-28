import { Context } from "hono";
import { db } from "../lib/db";
import { notes, templates } from "../db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import z from "zod";


export const getmytemplates = async (c:Context)=>{
    try {
        const user = c.get("user")

        const mytemplates = await db.select().from(templates).where(eq(templates.creatorId,user.id)).orderBy(desc(templates.createdAt))

        return c.json(mytemplates,200)
        
    } catch (error) {
        console.log("error in getting my templates",error);
        return c.json({
            success:false,
            error:error,
            message:"error in getting your templates "
        },500)
    }
}

export const getCommunitytemplates = async(c:Context)=>{
    try {
     const communitytemplates = await db.select().from(templates).where(eq(templates.ispublic,true))

     return c.json(communitytemplates,200)
    } catch (error) {
        console.log("error in getting community templates",error);
        return c.json({
            success:false,
            error:error,
            message:"error in getting community templates "
        },500)
    }
}

export const createtemplate = async (c:Context)=>{
    try {
        const user = c.get("user");
        const body = await c.req.json();
        
        if (!body.name?.trim()) return c.json({ error: "Name is required" }, 400);
       if (!body.schemapayload) return c.json({ error: "Content is required" }, 400);

       const [template] = await db
         .insert(templates)
         .values({
            creatorId: user.id,
            name: body.name.trim(),
            description: body.description?.trim() ?? null,
            schemapayload: body.schemapayload,
            ispublic: body.isPublic ?? false,
        }).returning();

      return c.json(template, 201);
    } catch (error) {
         console.log("error in creating  templates",error);
        return c.json({
            success:false,
            error:error,
            message:"error in creating templates "
        },500)
    }
}

export const createtemplatefromnote = async (c:Context)=>{
    try {
        const user = c.get("user")
        const noteid = c.req.param("noteid");
        const body = await c.req.json();
        if(!noteid) return c.json({error:"id is required for creating template from note"});
        
        const uuidCheck = z.uuid().safeParse(noteid);
        if (!uuidCheck.success) return c.json({ error: "Invalid ID format" }, 400);
        if(!body.name) return c.json({error:"name is required for the template to be created"},500)
        const [note] = await db.select().from(notes).where(eq(notes.id,noteid));

        if(!note) return c.json({error:"note not found"},404)

        const [template] = await db.insert(templates).values({
            creatorId:user.id,
            name:body.name.trim(),
            description:body.description?.trim() ?? null,
            schemapayload:note.content,
            ispublic:body.ispublic
        }).returning();

        return c.json(template,201)
    } catch (error) {
         console.log("error in creatingtemplates from note ",error);
        return c.json({
            success:false,
            error:error,
            message:"error in creatingtemplates from note "
        },500)
    }
}

export const applytemplate = async (c:Context) =>{
    try {
        const user = c.get("user");
        const id = c.req.param("id");
        const body = await c.req.json();
        if(!id) return c.json({error:"id is required for applyingtemplate"});
        
        const uuidCheck = z.uuid().safeParse(id);
        if (!uuidCheck.success) return c.json({ error: "Invalid ID format" }, 400);

        const [template] = await db.select().from(templates).where(eq(templates.id,id))

        if(!template) return c.json({error:"template not found"},404);
        if (template.creatorId !== user.id && !template.ispublic) {
         return c.json({ error: "Forbidden" }, 403);
        }


       
        if(body.noteId){
           const [note] = await db.update(notes).set({
            content: template.schemapayload,
            updatedAt: new Date() 
        }).where(and(eq(notes.id, body.noteId), eq(notes.userId, user.id))).returning(); // Added the security check!

        if(!note) return c.json({error: "Note not found or unauthorized"}, 404);
        return c.json(note, 200)
        }
        const [note] = await db.insert(notes).values({
            userId:user.id,
            title:template.name,
            content:template.schemapayload,
        }).returning()

        return c.json(note,201);
    } catch (error) {
         console.log("error in applying   templates",error);
        return c.json({
            success:false,
            error:error,
            message:"error in applying templates "
        },500)
    }
}

export const updatetemplate = async (c:Context)=>{
    try {
        const user = c.get("user");
        const id = c.req.param("id");
        const body = await c.req.json();
        if(!id) return c.json({error:"id is required for updating template"});
        
        const uuidCheck = z.uuid().safeParse(id);
        if (!uuidCheck.success) return c.json({ error: "Invalid ID format" }, 400);
        
        const [template] = await db.select().from(templates)
         .where(and(eq(templates.id, id), eq(templates.creatorId, user.id)))
        
        if(!template) return c.json({error:"template not found"},401);

        const [updatetemplate]= await db.update(templates).set({
            name:body.name ?? template.name,
            schemapayload:body.schemapayload ?? template.schemapayload,
            ispublic:body.ispublic ?? template.ispublic,
            description:body.description ?? template.description,
            updatedAt:new Date()
        }).where(eq(templates.id,id)).returning();

        return c.json(updatetemplate,200)        
    } catch (error) {
         console.log("error in updating templates",error);
        return c.json({
            success:false,
            error:error,
            message:"error in updating templates "
        },500)
    }
}

export const deletetemplate = async (c:Context)=>{
    try {
        const user = c.get("user");
        const id = c.req.param("id");
        if(!id) return c.json({error:"id is required for deleting template"});
        
        const uuidCheck = z.uuid().safeParse(id);
        if (!uuidCheck.success) return c.json({ error: "Invalid ID format" }, 400);

        const [template]= await db.select().from(templates).where(and(eq(templates.id,id),eq(templates.creatorId,user.id)))
        if(!template) return c.json({error:"template not found"},401);

        await db.delete(templates).where(eq(templates.id,id))

        return c.json({success:true})
    } catch (error) {
         console.log("error in deleting templates",error);
        return c.json({
            success:false,
            error:error,
            message:"error in deleting templates "
        },500)
    }
}

export const gettemplate = async (c:Context)=>{
    try {
        const user = c.get("user");
        const id = c.req.param("id");
        if(!id) return c.json({error:"id is required for getting template"});
        
        const uuidCheck = z.uuid().safeParse(id);
        if (!uuidCheck.success) return c.json({ error: "Invalid ID format" }, 400);

        const [template]= await db.select().from(templates).where(
         and(
        eq(templates.id, id),
        or(eq(templates.creatorId, user.id), eq(templates.ispublic, true)) // Allow if owner OR public
         )
         )
        if(!template) return c.json({error:"template not found"},401);

        return c.json(template,200)
    } catch (error) {
        console.log("error in getting templates",error);
        return c.json({
            success:false,
            error:error,
            message:"error in getting templates "
        },500)
    }
}