import { and, desc, eq, isNull } from "drizzle-orm";
import { getLocalDb } from "../localdb";
import { chats, messages } from "../schema.local";

const getUserId = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("foldex_user_id");
};



export const fetchchats = async () => {
    try {
        const db = await getLocalDb();
        const userschats = await db.select().from(chats).orderBy(desc(chats.updatedAt));
        return userschats;
    } catch (error) {
        console.error("error fetching chats", error);
        return [];
    }
};

export const createchat = async (title: string) => {
    try {
        const userId = getUserId();
        const db = await getLocalDb();
        const [chat] = await db.insert(chats).values({
            title,
            userId: userId,
        }).returning();
        return chat;
    } catch (error) {
        console.error("error creating chat", error);
        throw error;
    }
};

export const getchat = async (id: string) => {
    try {
        const db = await getLocalDb();
        // Verify ownership
        const [chat] = await db.select().from(chats).where(eq(chats.id, id));
        if (!chat) throw new Error("chat not found");

        // Return the messages
        const chatmessages = await db.select().from(messages).where(eq(messages.chatId, id));
        return chatmessages;
    } catch (error) {
        console.error("error getting chat", error);
        throw error;
    }
};

export const updatechat = async (id: string, title: string) => {
    try {
        const db = await getLocalDb();
        const [existing] = await db.select().from(chats).where(eq(chats.id, id));
        if (!existing) throw new Error("chat not found");

        const [chat] = await db.update(chats).set({
            title: title ?? existing.title,
            updatedAt: new Date()
        }).where(eq(chats.id, id)).returning();

        return chat;
    } catch (error) {
        console.error("error updating chat", error);
        throw error;
    }
};

export const deletechat = async (id: string) => {
    try {
        const db = await getLocalDb();
        const [existing] = await db.select().from(chats).where(eq(chats.id, id));
        if (!existing) throw new Error("chat not found");

        await db.delete(chats).where(eq(chats.id, id));
        return { success: true };
    } catch (error) {
        console.error("error deleting chat", error);
        throw error;
    }
};

export const addmessage = async (chatId: string, role: string, content: string, parts: any) => {
    try {
        const db = await getLocalDb();
        // Verify chat ownership
        const [existing] = await db.select().from(chats).where(eq(chats.id, chatId));
        if (!existing) throw new Error("chat not found");

        const [message] = await db.insert(messages).values({
            chatId,
            role,
            content,
            parts,
        }).returning();

        // Update the chat's updatedAt so it sorts correctly in recents
        await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, chatId));

        return message;
    } catch (error) {
        console.error("error adding message", error);
        throw error;
    }
};
