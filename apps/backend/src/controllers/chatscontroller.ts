import { Context } from "hono";
import { db } from "../lib/db";
import { chats, messages } from "../db/schema";
import { and, eq } from "drizzle-orm";
import z from "zod";


export const createchat = async (c:Context)=>{
    try {
        const user = c.get("user");
        const body = await c.req.json();

        if(!body.title) return c.json({error:"title is required "},500)

        const [chat]= await db.insert(chats).values({
            title:body.title,
            userId:user.id
        }).returning();

        return c.json(chat,201)
    } catch (error) {
         console.log("error in creating chat ",error);
        return c.json({
            success:false,
            error:error,
            message:"error in creating chat  ",
        },500)
    }
}

export const fetchchats = async(c:Context)=>{
    try {
        const user = c.get("user");
        const userschats = await db.select().from(chats).where(eq(chats.userId,user.id))

        return c.json(userschats,200)
    } catch (error) {
         console.log("error in fetching chats ",error);
        return c.json({
            success:false,
            error:error,
            message:"error in fetching chats ",
        },500)
    }
}

export const getchat = async (c:Context)=>{
    try {
        const user = c.get("user");
        const id = c.req.param("id");

        if(!id) return c.json({error:"chat id is required"});
        const safeParse = z.uuid().safeParse(id);
        if(!safeParse.success) return c.json({error:"id is invalid "},500)
        
        //security check 
        const [chat] = await db.select().from(chats)
         .where(and(eq(chats.id, id), eq(chats.userId, user.id)))
        if (!chat) return c.json({ error: "chat not found" }, 404)

        const chatmessages = await db.select().from(messages).where(eq(messages.chatId,id))

        return c.json(chatmessages,200)
    } catch (error) {
         console.log("error in getting chats ",error);
        return c.json({
            success:false,
            error:error,
            message:"error in getting chats ",
        },500)
    }
}

export const updatechat = async (c:Context)=>{
    try {
        const user = c.get("user");
        const id = c.req.param("id")
        const body = await c.req.json();

        if(!id) return c.json({error:"chat id is required"});
        const safeParse = z.uuid().safeParse(id);
        if(!safeParse.success) return c.json({error:"id is invalid "},500)
        
        const [existing] = await db.select().from(chats).where(and(eq(chats.id,id),eq(chats.userId,user.id)))

        if(!existing) return c.json({error:"chat not found"},404)

        const [chat] = await db.update(chats).set({
            title:body.title ?? existing.title,
            updatedAt:new Date()
        }).where(and(eq(chats.id,id),eq(chats.userId,user.id))).returning();

        return c.json(chat,200)        
        
    } catch (error) {
         console.log("error in updating chat  ",error);
        return c.json({
            success:false,
            error:error,
            message:"error in updating chat ",
        },500)
    }
}

export const deletechat = async (c:Context)=>{
    try {
        const user = c.get("user");
        const id = c.req.param("id");

        if(!id) return c.json({error:"chat id is required"});
        const safeParse = z.uuid().safeParse(id);
        if(!safeParse.success) return c.json({error:"id is invalid "},500)
        
        const [existing] = await db.select().from(chats).where(and(eq(chats.id,id),eq(chats.userId,user.id)))

        if(!existing) return c.json({error:"chat not found"},404)
        
        await db.delete(chats).where(and(eq(chats.id,id),eq(chats.userId,user.id)))
        
        return c.json({success:true},200)
        
    } catch (error) {
        console.log("error in deleting chat ",error);
        return c.json({
            success:false,
            error:error,
            message:"error in deleting chat  ",
        },500)
    }
}

export const addmessage = async(c:Context)=>{
    try {
        const user = c.get("user");
        const id = c.req.param("id");
        const body = await c.req.json();

        if(!id) return c.json({error:"chat id is required"});
        const safeParse = z.uuid().safeParse(id);
        if(!safeParse.success) return c.json({error:"id is invalid "},500)
        
        const [existing] = await db.select().from(chats).where(and(eq(chats.id,id),eq(chats.userId,user.id)))

        if(!existing) return c.json({error:"chat not found"},404)
        
        if(!body.role || !body.content || !body.parts) return c.json({error:"content ,role ,parts is required "},500)

        const [message]= await db.insert(messages).values({
            chatId:id,
            role:body.role,
            content:body.content,
            parts:body.parts
        }).returning();

        // Update the chat's updatedAt so it sorts correctly in recents
        await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, id));
        
        return c.json(message,201)        
    } catch (error) {
        console.log("error in adding message ",error);
        return c.json({
            success:false,
            error:error,
            message:"error in adding message  ",
        },500)
    }
}

export const generatesmarttitle = async (c:Context)=>{
    
}