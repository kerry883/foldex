import { and, eq, isNull } from "drizzle-orm";
import { getLocalDb } from "../localdb";
import { folders, notes } from "../schema.local";

// Always call this fresh — never cache at module level
const getUserId = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("foldex_user_id"); 
};



function extractPreview(content: unknown, maxLength = 200): string | null {
    if (!content || !Array.isArray(content)) return null;
    let text = "";
    const walk = (blocks: any[]) => {
        for (const block of blocks) {
            if (text.length >= maxLength) break;
            if (Array.isArray(block.content)) {
                for (const inline of block.content) {
                    if (inline.type === "text" && inline.text) {
                        text += inline.text + " ";
                    }
                }
            }
            if (Array.isArray(block.children) && block.children.length > 0) {
                walk(block.children);
            }
        }
    };
    walk(content);
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

export const getusersnotes = async (folderId?: string) => {
    try {
        const userId = getUserId();
        const db = await getLocalDb();
        
        let usernotes = [];
        if (folderId) {
            usernotes = await db.select().from(notes).where(eq(notes.folderId, folderId));
        } else {
            usernotes = await db.select().from(notes);
        }
        return usernotes.map(note => ({
            id: note.id,
            title: note.title,
            folderId: note.folderId,
            isPinned: note.isPinned,
            preview: extractPreview(note.content),
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
        }));
    } catch (error) {
        console.error("error getting user notes", error);
        return [];
    }
};

export const createnote = async (title: string, folderId?: string, content?: any) => {
    try {
        const userId = getUserId();
        const db = await getLocalDb();
        if (folderId) {
            const folderCond = undefined;
            const [folder] = await db.select().from(folders).where(and(eq(folders.id, folderId), folderCond));
            if (!folder) throw new Error("folder not found");
        }
        const [note] = await db.insert(notes).values({
            userId: userId,
            title: title.trim() || "untitled",
            content: content ?? null,
            folderId: folderId ?? null,
            isPinned: false
        }).returning();

        return note;
    } catch (error) {
        console.error("error creating note", error);
        throw error;
    }
};

export const getnote = async (id: string) => {
    try {
        const db = await getLocalDb();
        const [note] = await db.select().from(notes).where(eq(notes.id, id));
        return note || null;
    } catch (error) {
        console.error("error getting note", error);
        throw error;
    }
};

export const updatenote = async (id: string, title?: string, content?: any, folderId?: string, isPinned?: boolean) => {
    try {
        const db = await getLocalDb();
        const [existing] = await db.select().from(notes).where(eq(notes.id, id));
        if (!existing) throw new Error("note not found");

        if (folderId) {
            const [folder] = await db.select().from(folders).where(eq(folders.id, folderId));
            if (!folder) throw new Error("folder not found");
        }
        const [note] = await db.update(notes).set({
            title: title?.trim() ?? existing.title,
            content: content !== undefined ? content : existing.content,
            folderId: folderId !== undefined ? folderId : existing.folderId,
            isPinned: isPinned !== undefined ? isPinned : existing.isPinned,
            updatedAt: new Date()
        }).where(eq(notes.id, id)).returning();
        return note;
    } catch (error) {
        console.error("error updating note", error);
        throw error;
    }
};

export const deletenote = async (id: string) => {
    try {
        const db = await getLocalDb();
        const [existing] = await db.select().from(notes).where(eq(notes.id, id));
        if (!existing) throw new Error("note not found");
        await db.delete(notes).where(eq(notes.id, id));
        return { success: true };
    } catch (error) {
        console.error("error deleting note", error);
        throw error;
    }
};

export const movenote = async (id: string, folderId?: string | null) => {
    try {
        const db = await getLocalDb();
        const [existing] = await db.select().from(notes).where(eq(notes.id, id));
        if (!existing) throw new Error("note not found");
        
        if (folderId) {
            const [folder] = await db.select().from(folders).where(eq(folders.id, folderId));
            if (!folder) throw new Error("folder not found");
        }
        const [note] = await db.update(notes).set({
            folderId: folderId ?? null,
            updatedAt: new Date()
        }).where(eq(notes.id, id)).returning();
        return note;
    } catch (error) {
        console.error("error moving note", error);
        throw error;
    }
};