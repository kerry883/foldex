import { z } from 'zod';



// Base schema  s
const successSchema = z.object({ success: z.literal(true) });
export const errorSchema = z.object({ success: z.literal(false), error: z.string() });

// --- Define a Zod schema for EACH tool's successful output ---

export const createNoteOutputSchema = successSchema.extend({
  note: z.object({id: z.string(), title: z.string()}), 
  message: z.string(),
});

export const updateNoteOutputSchema = successSchema.extend({
  note: z.object({id: z.string(), title: z.string()}),
  message: z.string(),
});



// Schemas for folder item summaries (ID + display name only)
const folderItemNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
});


const folderItemSubfolderSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const getFolderItemsOutputSchema = successSchema.extend({
  notes: z.array(folderItemNoteSchema),
  subfolders: z.array(folderItemSubfolderSchema),
  summary: z.string(),
});



export const createFolderOutputSchema = successSchema.extend({
  folder: z.string(),
  message: z.string(),
});
export const updateFolderOutputSchema = successSchema.extend({
  message: z.string(),
});
export const generateCodeSnippetOutputSchema = successSchema.extend({
  title: z.string(),
  language: z.string(),
  code: z.string(),
  description: z.string().optional(),

});
export const generateMermaidDiagramOutputSchema = successSchema.extend({
  title: z.string(),
  diagram: z.string(),
  description: z.string().optional(),
});


export const youtubeVideoOutputSchema = successSchema.extend({
  videoId: z.string(),
  title: z.string(),
  description: z.string(),
});
export const searchWebOutputSchema = successSchema.extend({
  message: z.string(),
  resultsContext: z.string(),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string(),
    content: z.string()
  })).optional()
});

export const addVideoOutputSchema = successSchema.extend({
  videoId: z.string(),
  message: z.string(),
});

export type AddVideoOutput = z.infer<typeof addVideoOutputSchema>;
export type SearchWebOutput = z.infer<typeof searchWebOutputSchema>;

export type GenerateCodeSnippetOutput = z.infer<typeof generateCodeSnippetOutputSchema>;
export type YoutubeVideoOutput = z.infer<typeof youtubeVideoOutputSchema>;
export type CreateNoteOutput = z.infer<typeof createNoteOutputSchema>;
export type UpdateNoteOutput = z.infer<typeof updateNoteOutputSchema>;

export type CreateFolderOutput = z.infer<typeof createFolderOutputSchema>;
export type UpdateFolderOutput = z.infer<typeof updateFolderOutputSchema>;
export type GenerateMermaidDiagramOutput = z.infer<typeof generateMermaidDiagramOutputSchema>;

// For types with Convex Docs, we can be more specific
// Lightweight item types for folder exploration (ID + display name only)
export type FolderItemNote = { id: string; title: string };
export type FolderItemFile = { id: string; fileName: string };
export type FolderItemFlashcard = { id: string; question: string };
export type FolderItemSubfolder = { id: string; name: string };

export type GetFolderItemsOutput = {
  success: true;
  notes: FolderItemNote[];
  subfolders: FolderItemSubfolder[];
  summary: string;
};

