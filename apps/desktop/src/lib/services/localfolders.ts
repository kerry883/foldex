import { and, eq, isNull } from "drizzle-orm";
import { getLocalDb } from "../localdb";
import { folders, notes} from "../schema.local";

const getUserId = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("foldex_user_id");
};


export const getusersfolders = async () => {
    try {
        const db = await getLocalDb();
        const usersfolders = await db.select().from(folders);
        return usersfolders;
    } catch (error) {
        console.error("error fetching folders", error);
        return [];
    }
};

export const getfolderbyid = async (id: string) => {
    try {
        const db = await getLocalDb();
        const [folder] = await db.select().from(folders).where(eq(folders.id, id));
        if (!folder) throw new Error("folder not found");
        return folder;
    } catch (error) {
        console.error("error fetching folder", error);
        throw error;
    }
};

export const createfolder = async (name: string, parentId?: string, isPinned?: boolean, color?: string) => {
    try {
        const userId = getUserId();
        const db = await getLocalDb();

        if (parentId) {
            const [parent] = await db.select().from(folders).where(eq(folders.id, parentId));
            if (!parent) throw new Error("parent folder not found");
        }

        const [folder] = await db.insert(folders).values({
            userId: userId,
            name,
            parentId: parentId ?? null,
            isPinned: isPinned ?? false,
            color: color ?? "default",
        }).returning();

        return folder;
    } catch (error) {
        console.error("error creating folder", error);
        throw error;
    }
};

export const updatefolder = async (id: string, name?: string, parentId?: string, isPinned?: boolean, color?: string) => {
    try {
        const db = await getLocalDb();
        const [existing] = await db.select().from(folders).where(eq(folders.id, id));
        if (!existing) throw new Error("folder not found");

        if (parentId) {
            if (parentId === id) throw new Error("A folder cannot be its own parent");
            const [parent] = await db.select().from(folders).where(eq(folders.id, parentId));
            if (!parent) throw new Error("parent folder not found");
        }

        const [updatedfolder] = await db.update(folders).set({
            name: name !== undefined ? name : existing.name,
            parentId: parentId !== undefined ? parentId : existing.parentId,
            isPinned: isPinned !== undefined ? isPinned : existing.isPinned,
            color: color !== undefined ? color : existing.color,
            updatedAt: new Date()
        }).where(eq(folders.id, id)).returning();

        return updatedfolder;
    } catch (error) {
        console.error("error updating folder", error);
        throw error;
    }
};

export const deletefolder = async (id: string) => {
    try {
        const db = await getLocalDb();
        const [existing] = await db.select().from(folders).where(eq(folders.id, id));
        if (!existing) throw new Error("folder not found");

        await db.delete(folders).where(eq(folders.id, id));
        return { success: true };
    } catch (error) {
        console.error("error deleting folder", error);
        throw error;
    }
};
