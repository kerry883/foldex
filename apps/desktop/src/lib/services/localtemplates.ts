import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getLocalDb } from "../localdb";
import { notes, templates } from "../schema.local";

const getUserId = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("foldex_user_id");
};

export const getmytemplates = async () => {
    try {
        const db = await getLocalDb();
        const mytemplates = await db.select().from(templates).orderBy(desc(templates.createdAt));
        return mytemplates;
    } catch (error) {
        console.error("error getting templates", error);
        return [];
    }
};


export const createtemplate = async (name: string, schemapayload: any, description?: string, ispublic?: boolean) => {
    try {
        const userId = getUserId();
        const db = await getLocalDb();
        const [template] = await db.insert(templates).values({
            creatorId: userId,
            name: name.trim(),
            description: description?.trim() ?? null,
            schemapayload,
            ispublic: ispublic ?? false,
        }).returning();
        return template;
    } catch (error) {
        console.error("error creating template", error);
        throw error;
    }
};

export const createtemplatefromnote = async (noteId: string, name: string, description?: string, ispublic?: boolean) => {
    try {
        const userId = getUserId();
        const db = await getLocalDb();
        const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
        if (!note) throw new Error("note not found");

        const [template] = await db.insert(templates).values({
            creatorId: userId,
            name: name.trim(),
            description: description?.trim() ?? null,
            schemapayload: note.content,
            ispublic: ispublic ?? false,
        }).returning();
        return template;
    } catch (error) {
        console.error("error creating template from note", error);
        throw error;
    }
};

export const applytemplate = async (id: string, noteId?: string) => {
    try {
        const userId = getUserId();
        const db = await getLocalDb();

        // Allow if creator or public
        const [template] = await db.select().from(templates).where(
            and(eq(templates.id, id), eq(templates.ispublic, true)));
        if (!template) throw new Error("template not found");


        if (noteId) {
            // Apply to existing note
            const [note] = await db.update(notes).set({
                content: template.schemapayload,
                updatedAt: new Date()
            }).where(eq(notes.id, noteId)).returning();
            if (!note) throw new Error("note not found");
            return note;
        }

        // Create new note from template
        const [note] = await db.insert(notes).values({
            userId: userId,
            title: template.name,
            content: template.schemapayload,
        }).returning();
        return note;
    } catch (error) {
        console.error("error applying template", error);
        throw error;
    }
};

export const gettemplate = async (id: string) => {
    try {
        const db = await getLocalDb();
        const [template] = await db.select().from(templates).where(
            and(eq(templates.id, id), eq(templates.ispublic, true)));
        if (!template) throw new Error("template not found");
        return template;
    } catch (error) {
        console.error("error getting template", error);
        throw error;
    }
};

export const updatetemplate = async (id: string, name?: string, schemapayload?: any, description?: string, ispublic?: boolean) => {
    try {
        const db = await getLocalDb();
        const [existing] = await db.select().from(templates).where(eq(templates.id, id));
        if (!existing) throw new Error("template not found");

        const [updated] = await db.update(templates).set({
            name: name ?? existing.name,
            schemapayload: schemapayload ?? existing.schemapayload,
            ispublic: ispublic !== undefined ? ispublic : existing.ispublic,
            description: description ?? existing.description,
            updatedAt: new Date()
        }).where(eq(templates.id, id)).returning();
        return updated;
    } catch (error) {
        console.error("error updating template", error);
        throw error;
    }
};

export const deletetemplate = async (id: string) => {
    try {
        const db = await getLocalDb();
        const [existing] = await db.select().from(templates).where(eq(templates.id, id));
        if (!existing) throw new Error("template not found");

        await db.delete(templates).where(eq(templates.id, id));
        return { success: true };
    } catch (error) {
        console.error("error deleting template", error);
        throw error;
    }
};
