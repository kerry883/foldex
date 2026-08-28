import { tool } from "ai";
import { z } from "zod";
import type { LanguageModel } from "ai";

// Local services
import { getusersnotes, getnote, createnote, updatenote } from "@/lib/services/localnotes";
import { getusersfolders, createfolder, updatefolder } from "@/lib/services/localfolders";
import { getLocalDecryptedKey } from "@/lib/services/localapikeys";


// Note agent
import { createNoteContent, updateNoteContent } from "./note-agent";
import { convertSchemaToBlockNote, blockNoteToMarkdown, type BlockNoteContent } from "./block-parser";

export function createClientTools(model: LanguageModel) {
  return {
    getfolderitems: tool({
      description:
        "Get all content (notes, subfolders) from a folder. Returns only IDs and names to save context. Use this to understand what's in a folder before taking actions.",
      inputSchema: z.object({
        folderId: z.string().describe("The folder ID to fetch content from"),
      }),
      execute: async ({ folderId }) => {
        try {
          const [folderNotes, allFolders] = await Promise.all([
            getusersnotes(folderId),
            getusersfolders(),
          ]);

          const subfolders = allFolders.filter(f => f.parentId === folderId);
          const filteredNotes = folderNotes.map(n => ({ id: n.id, title: n.title }));
          const filteredSubfolders = subfolders.map(f => ({ id: f.id, name: f.name }));

          console.log('[ClientTools] getfolderitems:', filteredNotes.length, 'notes,', filteredSubfolders.length, 'subfolders');
          return {
            success: true,
            notes: filteredNotes,
            subfolders: filteredSubfolders,
            summary: `Found ${filteredNotes.length} notes and ${filteredSubfolders.length} subfolders`,
          };
        } catch (error) {
          console.error("[ClientTools] getfolderitems error:", error);
          return { success: false, error: `Failed to fetch folder items: ${error}` };
        }
      },
    }),

    createNote: tool({
      description: `Create a comprehensive study note using the specialized notes agent. 
       Use this when you want to create a rich, well-structured note with quizzes and embedded videos.
       The agent will generate proper BlockNote-compatible content.
       IMPORTANT: Before calling this, you should:
       1. Use youtubeVideo tool to find relevant video(s)
       2. Use searchTheWeb tool if you need additional context
       Then pass the YouTube URLs and context to this tool.`,
      inputSchema: z.object({
        folderId: z.optional(z.string().describe("The optional folder ID where the note should be created")),
        title: z.string().describe("Note title - generate an appropriate title based on the topic"),
        prompt: z.string().describe("The detail prompt for the agent to generate the note"),
        context: z.string().optional().describe("Additional context from web search or other sources"),
        youtubeUrls: z.array(z.string()).optional().describe("YouTube video URLs to embed in the note"),
        includeQuiz: z.boolean().optional().describe("Whether to include a quiz section (default: true)"),
        quizQuestionCount: z.number().optional().describe("Number of quiz questions (default: 3)"),
        includeMermaid: z.boolean().optional().describe("Whether to include a mermaid diagram (default: false)"),
      }),
      execute: async ({
        folderId,
        title,
        prompt,
        context,
        youtubeUrls,
        includeQuiz = true,
        quizQuestionCount = 3,
        includeMermaid = true
      }) => {
        try {
          console.log('[ClientTools] Creating note with agent:', title);

          // Call the note agent to generate structured content
          const blocks = await createNoteContent({
            topic: prompt,
            context: context || "",
            youtubeUrls: youtubeUrls || [],
            includeQuiz,
            quizQuestionCount,
            includeMermaid,
            model,
          });

          // Convert to BlockNote format
          const blockNoteContent = convertSchemaToBlockNote(blocks);

          // Save to local SQLite
          const note = await createnote(title, folderId ?? undefined, blockNoteContent);

          console.log('[ClientTools] Created note:', note.id);
          return {
            success: true,
            note: { id: note.id, title: note.title },
            message: `Created comprehensive note: "${title}"`,
          };
        } catch (error) {
          console.error("[ClientTools] createNote error:", error);
          return { success: false, error: `Failed to create note: ${error}` };
        }
      },
    }),

    updateNote: tool({
      description: `Update an existing note using the specialized notes agent.
       This tool will:
       1. Fetch the current note content (as readable markdown)
       2. Pass it to the notes agent with your update instructions
       3. The agent will produce the complete updated content
       
       Use this when the user wants to add sections, modify content, or enhance an existing note.
       The agent preserves existing content while applying the requested changes.`,
      inputSchema: z.object({
        noteId: z.string().describe("The note ID to update"),
        updateInstructions: z.string().describe("What changes to make to the note"),
        newContext: z.string().optional().describe("Additional context from web search for the update"),
        youtubeUrls: z.array(z.string()).optional().describe("New YouTube video URLs to add to the note"),
        includeQuiz: z.boolean().optional().describe("Whether to include a quiz section (default: true)"),
        quizQuestionCount: z.number().optional().describe("Number of quiz questions (default: 5)"),
        includeMermaid: z.boolean().optional().describe("Whether to include a mermaid diagram (default: false)"),
      }),
      execute: async ({
        noteId,
        updateInstructions,
        newContext,
        youtubeUrls,
        includeQuiz,
        quizQuestionCount,
        includeMermaid,
      }) => {
        try {
          console.log('[ClientTools] Updating note:', noteId);

          // Fetch existing note from local SQLite
          const existingNote = await getnote(noteId);
          if (!existingNote) {
            return { success: false, error: "Note not found" };
          }

          const existingMarkdown = blockNoteToMarkdown(existingNote.content as BlockNoteContent);

          // Call the note agent with existing content + instructions
          const updatedBlocks = await updateNoteContent({
            existingMarkdown,
            updateInstructions,
            newContext: newContext || "",
            youtubeUrls: youtubeUrls || [],
            includeQuiz,
            quizQuestionCount,
            includeMermaid,
            model,
          });

          // Convert and save locally
          const blockNoteContent = convertSchemaToBlockNote(updatedBlocks);
          const note = await updatenote(noteId, undefined, blockNoteContent);

          console.log('[ClientTools] Updated note:', note?.id);
          return {
            success: true,
            note: { id: note?.id, title: note?.title },
            message: `Note updated successfully with ${updatedBlocks.length} content blocks`,
          };
        } catch (error) {
          console.error("[ClientTools] updateNote error:", error);
          return { success: false, error: `Failed to update note: ${error}` };
        }
      },
    }),

    getNoteContent: tool({
      description: "Get the content of a specific note",
      inputSchema: z.object({
        noteId: z.string().describe("The note ID to fetch"),
      }),
      execute: async ({ noteId }) => {
        try {
          const note = await getnote(noteId);
          if (!note) {
            return { success: false, error: "Note content not found" };
          }
          const markdown = blockNoteToMarkdown(note.content as BlockNoteContent);
          console.log('[ClientTools] getNoteContent:', noteId);
          return { success: true, markdown };
        } catch (error) {
          console.error("[ClientTools] getNoteContent error:", error);
          return { success: false, error: `Failed to get note content: ${error}` };
        }
      },
    }),

    searchTheWeb: tool({
      description: "Search the web for recent information on a topic. Use this for any current events, facts, or questions that your internal knowledge does not cover. Requires the user to have a Tavily API key configured in Settings.",
      inputSchema: z.object({
        query: z.string().describe("The search query to find information about."),
      }),
      execute: async ({ query }) => {
        console.log(`[ClientTools] Searching web for: ${query}`);
        try {
          const tavilyKey = await getLocalDecryptedKey("tavily");
          if (!tavilyKey) {
            return {
              success: false,
              error: "Web search requires a Tavily API key. Please add one in Settings → API Keys.",
            };
          }

          // Call Tavily REST API directly (no need for @tavily/core)
          const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query,
              search_depth: "basic",
              max_results: 5,
              include_answer: true,
            }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.message || `Tavily returned ${res.status}`);
          }

          const data = await res.json();
          const sources = (data.results || []).map((r: any) => ({
            title: r.title,
            url: r.url,
            content: r.content,
          }));

          const numberedSources = (data.results || [])
            .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.content}`)
            .join("\n\n");

          const context = `
Research findings:
${data.answer || "No summary available."}

Sources:
${numberedSources}

Instructions: Cite these sources using [1], [2], [3], etc. in your response.
`;
          return {
            success: true,
            message: `Found ${sources.length} results.`,
            resultsContext: context,
            sources,
          };
        } catch (error) {
          console.error("[ClientTools] searchTheWeb error:", error);
          return { success: false, error: `Failed to execute search: ${error}` };
        }
      },
    }),

    createFolder: tool({
      description: "Create a new folder with a name and optional description. Can create subfolders by specifying a parentId.",
      inputSchema: z.object({
        name: z.string().describe("The name of the folder based on the topic"),
        parentId: z
          .string()
          .optional()
          .describe("Optional parent folder ID to create this as a subfolder."),
      }),
      execute: async ({ name, parentId }) => {
        try {
          const folder = await createfolder(name, parentId);

          console.log('[ClientTools] Created folder:', folder.id);
          const message = parentId
            ? `Created subfolder: "${name}"`
            : `Created folder: "${name}"`;
          return { success: true, folder, message };
        } catch (error) {
          console.error("[ClientTools] createFolder error:", error);
          return { success: false, error: `Failed to create folder: ${error}` };
        }
      },
    }),

    updateFolder: tool({
      description: "Update the name and description of an existing folder.",
      inputSchema: z.object({
        folderId: z.string().describe("The folder ID to update"),
        name: z.string().optional().describe("The new name for the folder"),
        parentId: z.string().optional().describe("Optional parent folder ID."),
      }),
      execute: async ({ folderId, name, parentId }) => {
        try {
          await updatefolder(folderId, name, parentId);

          console.log('[ClientTools] Updated folder:', folderId);
          return { success: true, message: `Updated folder: "${name}"` };
        } catch (error) {
          console.error("[ClientTools] updateFolder error:", error);
          return { success: false, error: `Failed to update folder: ${error}` };
        }
      },
    }),

    generateCodeSnippet: tool({
      description:
        "Generate a code snippet. Use this when the user asks for code examples, algorithms, or solutions. This renders a nice code editor in the UI.",
      inputSchema: z.object({
        title: z.string().describe('Short title for the snippet'),
        language: z.string().describe('Programming language, e.g., "python", "typescript"'),
        code: z.string().describe("The actual code content"),
        description: z.string().optional().describe("Brief explanation of what the code does"),
      }),
      execute: async ({ title, language, code, description }) => {
        return { success: true, title, language, code, description };
      },
    }),

    generateMermaidDiagram: tool({
      description:
        "Generate a Mermaid diagram for visualizing concepts, processes, or relationships.",
      inputSchema: z.object({
        title: z.string().describe("Title for the diagram"),
        diagramType: z.enum([
          "flowchart", "sequence", "class", "state", "er",
          "gantt", "pie", "mindmap", "xy", "block",
        ]),
        diagram: z.string().describe("The Mermaid diagram code"),
        description: z.string().optional().describe("Brief explanation"),
      }),
      execute: async ({ title, diagramType, diagram, description }) => {
        try {
          if (!diagram.trim()) {
            return { success: false, error: "Diagram code cannot be empty" };
          }
          return {
            success: true,
            title,
            diagram,
            description: description || `${diagramType} diagram showing ${title}`,
          };
        } catch (error) {
          return { success: false, error: `Failed to generate diagram: ${error}` };
        }
      },
    }),

    youtubeVideo: tool({
      description: "Search for a YouTube video and play it. Use this when the user asks for a video tutorial or visual explanation.",
      inputSchema: z.object({
        query: z.string().describe("Search query for YouTube"),
      }),
      execute: async ({ query }) => {
        console.log("[ClientTools] YouTube search:", query);

        const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
        if (!apiKey) {
          return { success: false, error: "YouTube search is not configured." };
        }

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (!response.ok || data.error) {
            return { success: false, error: `YouTube API error: ${data.error?.message || response.statusText}` };
          }

          const firstResult = data.items?.[0];
          if (!firstResult) {
            return { success: false, error: "No video found for the given query." };
          }

          const videoId = firstResult.id?.videoId;
          if (!videoId) {
            return { success: false, error: "Could not parse Video ID from response" };
          }

          return {
            success: true,
            videoId,
            title: firstResult.snippet.title,
            description: firstResult.snippet.description,
          };
        } catch (e) {
          console.error("[ClientTools] YouTube search error:", e);
          return { success: false, error: "YouTube search failed due to network or parsing error" };
        }
      },
    }),

    generateVideo: tool({
      description: "Generate an AI-powered Manim explainer video. Use this when the user asks for a visual animation or video explanation of a concept. The video will be rendered in the background and the user will be notified when it's ready. This is a beta feature.",
      inputSchema: z.object({
        prompt: z.string().describe("A detailed description of what concept to explain in the video"),
        folderId: z.string().optional().describe("Optional folder ID to place the video in"),
      }),
      execute: async ({ prompt, folderId }) => {
        try {
          // Dynamic import to avoid bundling issues
          const { generateManimCode } = await import("./manim-agent");
          const { videoapi } = await import("@/lib/api");

          // Generate Manim code locally using the user's model
          console.log("[ClientTools] Generating Manim code locally...");
          const manimResult = await generateManimCode({ prompt, model });

          // Submit to backend for rendering
          const result = await videoapi.generate({
            title: manimResult.title,
            sceneName: manimResult.sceneName,
            code: manimResult.code,
            description: manimResult.description,
            prompt,
            folderId:folderId,
          });

          console.log("[ClientTools] generateVideo: queued", result.videoId);
          return {
            success: true,
            videoId: result.videoId,
            title: manimResult.title,
            message: `Video "${manimResult.title}" is being generated. The user will be notified when it's ready.`,
          };
        } catch (error) {
          console.error("[ClientTools] generateVideo error:", error);
          return { success: false, error: `Failed to generate video: ${error}` };
        }
      },
    }),

  };
}
