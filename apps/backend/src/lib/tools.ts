import { tool } from "ai";
import z from "zod";
import { db } from "./db";
import { folders, notes, videos } from "../db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { blockNoteToMarkdown, BlockNoteContent, convertSchemaToBlockNote } from "./ai-block-parser";
import { Context } from "hono";
import { createNoteContent, updateNoteContent } from "./noteagent";
import { tavily } from "@tavily/core";
import { getDecryptedKey } from "../controllers/apikeycontroller";
import type { LanguageModel } from "ai";

export function createTools(c: Context, model: LanguageModel) {
    const user = c.get("user");
  return {
    getfolderitems: tool({
      description:
        "Get all content (notes, subfolders) from a folder. Returns only IDs and names to save context. Use this to understand what's in a folder before taking actions.",
      inputSchema: z.object({
        folderId: z.string().describe("The folder ID to fetch content from"),
      }),
      execute: async ({
        folderId,
      })=> {
        try {
          const [usernotes, subfolders] = await Promise.all([
            db.select().from(notes).where(eq(notes.folderId,folderId)),
            db.select().from(folders).where(eq(folders.parentId,folderId))
          ]);

          // Return only IDs and display names to save context window
          const filteredNotes = usernotes?.map((n) => ({ id: n.id, title: n.title })) || [];
          const filteredSubfolders = subfolders?.map((f) => ({ id: f.id, name: f.name })) || [];

          console.log("success in getfolderitems");
          console.log('used getfolderitems tool');
          return {
            success: true,
            notes: filteredNotes,
            subfolders: filteredSubfolders,
            summary: `Found ${filteredNotes.length} notes and ${filteredSubfolders.length} subfolders`,
          };
        } catch (error) {
          console.log("getfolderitems error", error);
          return {
            success: false,
            error: `Failed to fetch folder items: ${error}`,
          };
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
        prompt: z.string().describe("The detail prompt for the agent to generate the note "),
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
          console.log('=== ORCHESTRATOR: Creating note with agent ===');
          console.log('Prompt:', prompt);
          console.log('YouTube URLs:', youtubeUrls);

          // Call the specialized notes agent with the user's selected model
          const blocks = await createNoteContent({
            topic: prompt,
            context: context || "",
            youtubeUrls: youtubeUrls || [],
            includeQuiz,
            quizQuestionCount,
            includeMermaid: includeMermaid,
            model,
          });

          console.log('=== ORCHESTRATOR: Agent returned blocks ===');
          console.log('Block count:', blocks.length);

          // Convert to BlockNote format
          const blockNoteContent = convertSchemaToBlockNote(blocks);

          // Save to database
          const [note] = await db.insert(notes).values({
            userId: user.id,
            folderId: folderId ?? undefined,
            title: title,
            content: blockNoteContent,
          }).returning();

          console.log("Created note with agent:", note);
          return {
            success: true,
            note: { id: note.id, title: note.title },
            message: `Created comprehensive note: "${title}"`,
          };
        } catch (error) {
          console.log("Agent note creation error:", error);
          return {
            success: false,
            error: `Failed to create note with agent: ${error}`,
          };
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
        updateInstructions: z.string().describe("What changes to make to the note (e.g., 'Add a section about error handling', 'Include more examples', 'Add a quiz at the end')"),
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
          console.log('=== ORCHESTRATOR: Updating note with agent ===');
          console.log('Note ID:', noteId);
          console.log('Instructions:', updateInstructions);

          // Step 1: Fetch existing content as markdown
          const [existingNote] = await db.select().from(notes).where(and(eq(notes.id,noteId),eq(notes.userId,user.id)))
          if (!existingNote) {
            return { success: false, error: "Note not found " };
          }
          console.log('Existing note:', existingNote?.title);

          const existingMarkdown = blockNoteToMarkdown(existingNote.content as BlockNoteContent);
          console.log('Existing content length:', existingMarkdown.length);

          // Step 2: Call the notes agent with existing content + instructions
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

          console.log('=== ORCHESTRATOR: Agent returned updated blocks ===');
          console.log('Block count:', updatedBlocks.length);

          // Step 3: Convert and save
          const blockNoteContent = convertSchemaToBlockNote(updatedBlocks);

          const [note] = await db.update(notes).set({
            content:blockNoteContent
          }).where(and(eq(notes.id,noteId),eq(notes.userId,user.id))).returning()

          console.log("Updated note with agent:", note);
          return {
            success: true,
            note: { id: note.id, title: note.title },
            message: `Note updated successfully with ${updatedBlocks.length} content blocks`,
          };
        } catch (error) {
          console.log("Agent note update error:", error);
          return {
            success: false,
            error: `Failed to update note with agent: ${error}`,
          };
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
          const [note] = await db.select().from(notes).where(and(eq(notes.id,noteId),eq(notes.userId,user.id)))

          if (!note) {
            return { success: false, error: "Note content not found" };
          }
          const markdown = blockNoteToMarkdown(note.content as BlockNoteContent);
          console.log('used getnotecontent tool')
          return { success: true, markdown };
        } catch (error) {
          console.log("note content error", error);
          return {
            success: false,
            error: `Failed to get note content: ${error}`,
          };
        }
      },
    }),
    searchTheWeb: tool({
      description: "Search the web for recent information on a topic. Use this for any current events, facts, or questions that your internal knowledge does not cover. Requires the user to have a Tavily API key configured in Settings.",
      inputSchema: z.object({
        query: z.string().describe("The search query to find information about."),
      }),
      execute: async ({ query }) => {
        console.log(`Tool: searching web for: ${query}`);
        try {
          // Get the user's Tavily key (not a hardcoded env var)
          const tavilyKey = await getDecryptedKey(user.id, "tavily");
          if (!tavilyKey) {
            return {
              success: false,
              error: "Web search requires a Tavily API key. Please add one in Settings → API Keys.",
            };
          }

          const tavilyClient = tavily({ apiKey: tavilyKey });
          const results = await tavilyClient.search(query, {
            searchDepth: 'basic',
            maxResults: 5,
            includeAnswer: true,
          })
          const sources = results.results.map((result) => ({
            title: result.title,
            url: result.url,
            content: result.content,
          }))
          const numberedSources = results.results
            .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
            .join("\n\n");

          const context = `
Research findings:
${results.answer || "No summary available."}

Sources:
${numberedSources}

Instructions: Cite these sources using [1], [2], [3], etc. in your response.
`;
          console.log('used searchthe web tool')
          return {
            success: true,
            message: `Found ${results.results.length} results.`,
            resultsContext: context,
            sources: sources
          }
        } catch (error) {
          console.error("Error in searchTheWeb:", error);
          return { success: false, error: `Failed to execute search: ${error}` };
        }
      }
    }),
    createFolder: tool({
      description: "Create a new folder with a name and optional description. Can create subfolders by specifying a parentId.",
      inputSchema: z.object({
        name: z.string().describe("The name of the folder based on the topic"),
        parentId: z
          .string()
          .optional()
          .describe("Optional parent folder ID to create this as a subfolder. Use the tagged folder's ID if the user wants a subfolder."),
      }),
      execute: async ({
        name,
        parentId,
      })=> {
        try {
          const [folder] = await db.insert(folders).values({
            name,
            userId:user.id,
            color:"#4D7963",
            parentId:parentId ?? null,
          }).returning();
          console.log("created folder", folder);
          console.log('used createFolder tool');
          const message = parentId
            ? `Created subfolder: "${name}"`
            : `Created folder: "${name}"`;
          return {
            success: true,
            folder,
            message,
          };
        } catch (error) {
          console.log("folder creation error", error);
          return { success: false, error: `Failed to create folder: ${error}` };
        }
      },
    }),
    updateFolder: tool({
      description: "Update the name and description of an existing folder.",
      inputSchema: z.object({
        folderId: z.string().describe("The folder ID to update"),
        name: z.string().optional().describe("The new name for the folder"),
        parentId: z
          .string()
          .optional()
          .describe("Optional parent folder ID to create this as a subfolder. Use the tagged folder's ID if the user wants a subfolder."),
      }),
      execute: async ({
        folderId,
        name,
        parentId
      }) => {
        try {
          const [folder] = await db.update(folders).set({
            name,
            parentId:parentId ?? null,
            updatedAt: new Date()
          }).where(and(eq(folders.id,folderId),eq(folders.userId,user.id))).returning()
          console.log("updated folder", folder);
          console.log('used updateFolder tool')
          return { success: true, message: `Updated folder: "${name}"` };
        } catch (error) {
          console.log("folder update error", error);
          return { success: false, error: `Failed to update folder: ${error}` };
        }
      },
    }),

    generateCodeSnippet: tool({
      description:
        "Generate a code snippet. Use this when the user asks for code examples, algorithms, or solutions. This renders a nice code editor in the UI.",
      inputSchema: z.object({
        title: z
          .string()
          .describe(
            'Short title for the snippet, e.g., "Dijkstra Implementation"'
          ),
        language: z
          .string()
          .describe(
            'Programming language, e.g., "python", "typescript", "react"'
          ),
        code: z.string().describe("The actual code content"),
        description: z
          .string()
          .optional()
          .describe("Brief explanation of what the code does"),
      }),
      execute: async ({
        title,
        language,
        code,
        description,
      }) => {
        return {
          success: true,
          title,
          language,
          code,
          description,
        };
      },
    }),

    generateMermaidDiagram: tool({
      description:
        "Generate a Mermaid diagram for visualizing concepts, processes, or relationships. Use this to create flowcharts, sequence diagrams, class diagrams, etc.",
      inputSchema: z.object({
        title: z.string().describe("Title for the diagram"),
        diagramType: z.enum([
          "flowchart",
          "sequence",
          "class",
          "state",
          "er",
          "gantt",
          "pie",
          "mindmap",
          "xy",
          'block',
        ]),
        diagram: z.string().describe("The Mermaid diagram code"),
        description: z.string().optional().describe("Brief explanation"),
      }),
      execute: async ({
        title,
        diagramType,
        diagram,
        description,
      }) => {
        try {
          if (!diagram.trim()) {
            return { success: false, error: "Diagram code cannot be empty" };
          }
          console.log("used diagram", diagram);
          return {
            success: true,
            title,
            diagram,
            description:
              description || `${diagramType} diagram showing ${title}`,
          };
        } catch (error) {
          console.log("error in generateMermaidDiagram", error);
          return {
            success: false,
            error: `Failed to generate diagram: ${error}`,
          };
        }
      },
    }),
    youtubeVideo: tool({
      description: "Search for a YouTube video and play it. Use this when the user asks for a video tutorial or visual explanation.",
      inputSchema: z.object({
        query: z.string().describe("Search query for YouTube (e.g., 'Pythagoras theorem tutorial')"),
      }),
      execute: async ({ query })=> {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        console.log("used youtube search", query);

        // Use YouTube Data API v3 instead of Custom Search API
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

        try {
          const response = await fetch(url);
          const data = await response.json();

          // Log and handle API errors like rate limits or permissions
          if (!response.ok || data.error) {
            console.error("YouTube search API error:", JSON.stringify(data.error || data, null, 2));
            return { success: false, error: `YouTube API error: ${data.error?.message || response.statusText}` };
          }

          const firstResult = data.items?.[0];

          if (!firstResult) {
            console.log("No video found in API response for query:", query);
            return { success: false, error: "No video found for the given query." };
          }

          const videoId = firstResult.id?.videoId;

          if (!videoId) {
            console.log("error parsing video ID out of YouTube API response");
            return { success: false, error: "Could not parse Video ID from response" };
          }

          console.log("successfully retrieved youtube video:", videoId);
          return {
            success: true,
            videoId,
            title: firstResult.snippet.title,
            description: firstResult.snippet.description
          };
        } catch (e) {
          console.error("error youtube search", e);
          return { success: false, error: "YouTube search failed due to network or parsing error" };
        }
      }
    }),

    generateVideo: tool({
      description: "Generate an AI-powered Manim explainer video. Use this when the user asks for a visual animation or video explanation of a concept. The video will be rendered in the background and the user will be notified when it's ready. This is a beta feature.",
      inputSchema: z.object({
        prompt: z.string().describe("A detailed description of what concept to explain in the video"),
        folderId: z.string().optional().describe("Optional folder ID to place the video in"),
      }),
      execute: async ({ prompt, folderId }) => {
        try {
          const { generateManimCode } = await import("./manim-agent");
          const { videoQueue } = await import("./video-worker");

          // Rate limit: 5 videos per 24h
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(videos)
            .where(and(eq(videos.userId, user.id), gte(videos.createdAt, twentyFourHoursAgo)));
          if ((countResult?.count ?? 0) >= 5) {
            return { success: false, error: "Daily video limit reached (5/day during beta). Try again tomorrow." };
          }

          // Generate Manim code
          const manimResult = await generateManimCode({ prompt, model });

          // Insert video row
          const [video] = await db.insert(videos).values({
            userId: user.id,
            folderId: folderId ?? null,
            creatorname: user.name,
            creatorprofile: user.image,
            title: manimResult.title,
            code: manimResult.code,
            description: manimResult.description,
            transcript: manimResult.transcript,
            tags: manimResult.tags,
            status: "queued",
            prompt,
            isPublic: true,
          }).returning();

          // Queue render job
          await videoQueue.add('render-job', {
            videoId: video.id,
            code: manimResult.code,
            sceneName: manimResult.sceneName,
            retryCount: 0,
          }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          });

          console.log("[Tool] generateVideo: queued", video.id);
          return {
            success: true,
            videoId: video.id,
            title: manimResult.title,
            message: `Video "${manimResult.title}" is being generated. The user will be notified when it's ready.`,
          };
        } catch (error) {
          console.error("[Tool] generateVideo error:", error);
          return { success: false, error: `Failed to generate video: ${error}` };
        }
      },
    }),

  };
}