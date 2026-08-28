import { Hono } from "hono";
import { requireauth } from "../middleware/requireauth";
import { getDecryptedKey } from "../controllers/apikeycontroller";
import { getEffectiveSystemPrompt } from "../controllers/settingscontroller";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createXai, xai } from "@ai-sdk/xai";
import type { Appvariables } from "../index";

import {
  streamText,
  generateText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
  Output,
} from "ai";
import { z } from "zod";
import { db } from "../lib/db";
import { apiKeys } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { decryptKey } from "../lib/crypto";
import { createTools } from "../lib/tools";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createMoonshotAI } from "@ai-sdk/moonshotai";

const aiRouter = new Hono<{ Variables: Appvariables }>();

// Map model IDs to their provider
const MODEL_PROVIDER_MAP: Record<string, string> = {
    // OpenAI
    "gpt-5.4-pro": "openai",
    "gpt-5.4-nano": "openai",
    "gpt-5.4-mini": "openai",
    "gpt-5.4": "openai",
    "gpt-5.3-chat-latest": "openai",
    "gpt-5.2-pro": "openai",
    "gpt-5.2": "openai",
    "gpt-5.1-chat-latest": "openai",
    // Anthropic
    "claude-opus-4-7": "anthropic",
    "claude-opus-4-6": "anthropic",
    "claude-opus-4-5": "anthropic",
    "claude-sonnet-4-6":"anthropic",
    "claude-sonnet-4-5":"anthropic",
    "claude-haiku-4-5":"anthropic",
    // Google
    "gemini-3.1-pro-preview": "google",
    "gemini-3.1-flash-lite-preview": "google",
    "gemini-3-pro-preview": "google",
    "gemini-3-flash-preview": "google",
    // DeepSeek (OpenAI-compatible)
    "deepseek-chat": "deepseek",
    "deepseek-reasoner": "deepseek",
    // xAI
    "grok-4-1-fast-reasoning": "xai",
    "grok-4.1-fast-non-reasoning": "xai",
    "grok-4-fast-reasoning": "xai",
    "grok-4-fast-non-reasoning": "xai",
    "grok-4": "xai",
    "grok-3": "xai",
    // Moonshot (OpenAI-compatible)
    "kimi-k2.5": "moonshot",
    "kimi-k2": "moonshot",
};

function getProviderForModel(modelId: string): string | null {
    return MODEL_PROVIDER_MAP[modelId] || null;
}

// Map small models for generation tasks
const PREFERRED_SMALL_MODELS = [
    { provider: "google", model: "gemini-2.5-flash" },
    { provider: "openai", model: "gpt-4o-mini" }, // assuming this is available as gpt-5.4-mini
    { provider: "anthropic", model: "claude-haiku-4-5" },
    { provider: "xai", model: "grok-3" }, // grok-3 is fast
    { provider: "moonshot", model: "kimi-k2" },
    { provider: "deepseek", model: "deepseek-chat" },
];

async function getBestSmallModelInstance(userId: string) {
    const configuredKeys = await db.select().from(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.isValid, true)));
    if (configuredKeys.length === 0) {
        throw new Error("No valid API keys configured");
    }

    for (const pref of PREFERRED_SMALL_MODELS) {
        const keyRecord = configuredKeys.find(k => k.provider === pref.provider);
        if (keyRecord) {
            const apiKey = decryptKey(keyRecord.encryptedKey, keyRecord.iv, keyRecord.authTag);
            let actualModelId = pref.model;
            // Map the preferred model to the user's available model identifiers if needed
            if (pref.model === "gpt-4o-mini") actualModelId = "gpt-5.4-mini"; // using app's naming convention

            const providerInstance = createProviderInstance(pref.provider, apiKey);
            return providerInstance(actualModelId);
        }
    }
    
    // Fallback to whatever is available
    const fallbackKey = configuredKeys[0];
    const apiKey = decryptKey(fallbackKey.encryptedKey, fallbackKey.iv, fallbackKey.authTag);
    // get any model for this provider
    const availableModel = Object.keys(MODEL_PROVIDER_MAP).find(k => MODEL_PROVIDER_MAP[k] === fallbackKey.provider) || "default";
    return createProviderInstance(fallbackKey.provider, apiKey)(availableModel);
}

function createProviderInstance(provider: string, apiKey: string) {
    switch (provider) {
        case "openai":
            return createOpenAI({ apiKey });
        case "anthropic":
            return createAnthropic({ apiKey });
        case "google":
            return createGoogleGenerativeAI({ apiKey });
        case "deepseek":
            return createDeepSeek({ apiKey });
        case "xai":
            return createXai({ apiKey });
        case "moonshot":
            return createMoonshotAI({apiKey});
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

function parseProviderError(error: any, providerName: string): { status: number; message: string } {
    const status = error?.status || error?.statusCode || 500;
    const rawMessage = error?.message || error?.error?.message || "Unknown error";

    if (status === 401 || status === 403) {
        return { status: 401, message: `Your ${providerName} API key is invalid or expired. Update it in Settings.` };
    }
    if (status === 402 || rawMessage.toLowerCase().includes("insufficient") || rawMessage.toLowerCase().includes("quota")) {
        return { status: 402, message: `Your ${providerName} account has insufficient credits. Please add credits and try again.` };
    }
    if (status === 429) {
        return { status: 429, message: `Rate limited by ${providerName}. Please try again in a moment.` };
    }
    return { status: 500, message: `Error from ${providerName}: ${rawMessage}` };
}

aiRouter.post("/chat", requireauth, async (c) => {
    try {
        const user = c.get("user");
        const {
    messages,
    webSearch,
    model:modelId,
    contextFolder,
    contextNote,
    filecontext
  }: {
    messages: UIMessage[];
    webSearch?: boolean;
    model: string;
    contextFolder?: { id: string, name: string }[];
    contextNote?: { id: string, title: string }[];
    filecontext?:string;
  } = await c.req.json();

        if (!modelId || !messages) {
            return c.json({ error: "model and messages are required" }, 400);
        }

        // 1. Determine provider from model
        const provider = getProviderForModel(modelId);
        if (!provider) {
            return c.json({ error: `Unknown model: ${modelId}. Please select a valid model.` }, 400);
        }

        // 2. Get decrypted API key
        const apiKey = await getDecryptedKey(user.id, provider);
        if (!apiKey) {
            return c.json({
                error: `No API key configured for ${provider}. Add one in Settings → API Keys.`
            }, 400);
        }

        // 3. Get system prompt with context
        const systemPrompt = await getEffectiveSystemPrompt(user.id, user.name, contextFolder, contextNote,filecontext);

        
        if (webSearch) {
            const tavilyKey = await getDecryptedKey(user.id, "tavily");
            if (!tavilyKey) {
                return c.json({
                    error: "Web search requires a Tavily API key. Add one in Settings → API Keys."
                }, 400);
            }
        }

        // 5. Create provider + stream
        const providerInstance = createProviderInstance(provider, apiKey);
        const modelInstance = providerInstance(modelId);
        const result = streamText({
            model: modelInstance,
            system: systemPrompt,
            tools: createTools(c, modelInstance),
            messages:await convertToModelMessages(messages),
            stopWhen:stepCountIs(10)
        });

        // 6. Return streaming response
        return c.body(result.toUIMessageStreamResponse({
            sendReasoning:true,
            sendSources:true
        }).body as ReadableStream);
    } catch (error: any) {
        console.error("AI streaming error:", error);

        // Try to extract provider-specific error
        const modelId = (await c.req.json().catch(() => ({}))).model;
        const provider = modelId ? getProviderForModel(modelId) : "provider";
        const parsed = parseProviderError(error, provider || "provider");

        return c.json({ error: parsed.message }, parsed.status as any);
    }
});

// --- STRUCTURED GENERATION SCHEMAS ---

const quizSchema = z.object({
  question: z.string(),
  type: z.enum(["single", "multiple", "frq"]),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  options: z.array(z.string()).optional().describe("Array of choices for single/multiple. one correct answer for FRQ."),
  correctAnswers: z.array(z.string()),
  explanation: z.string().describe("A structured explanation. First, explain why the correct answer is right. Then, explicitly list why EACH incorrect option is wrong."),
});

const quizListSchema = z.object({
  quizzes: z.array(quizSchema).min(1),
});

const flashcardSchema = z.object({
  question: z.string(),
  answer: z.string(),
  explanation: z.string(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
});

const flashcardListSchema = z.object({
  flashcards: z.array(flashcardSchema).min(1)
});

const GradeSchema = z.object({
  isCorrect: z.boolean().describe("True if the user understood the core concept, even if phrased differently."),
  score: z.number().min(0).max(100).describe("A confidence score of how well they knew it."),
  feedback: z.string().describe("Encouraging, direct feedback to the student in second person (you/your)."),
  missedConcepts: z.array(z.string()).describe("List of specific keywords or concepts the user forgot to mention."),
});

// --- STRUCTURED GENERATION ENDPOINTS ---

aiRouter.post("/generate-quizzes", requireauth, async (c) => {
    try {
        const user = c.get("user");
        const { topic, numQuestions, noteContent } = await c.req.json();
        
        if (!topic || !numQuestions) return c.json({ error: "topic and numQuestions required" }, 400);

        const modelInstance = await getBestSmallModelInstance(user.id);

        const systemContext = `You are an expert tutor creating study materials.
    TASK: Generate exactly ${numQuestions} distinct practice problems .user's prompt "${topic}"
    CONTEXT: Use the following notes as the primary source of truth. If the notes do not fully cover the topic, you may use your general knowledge to supplement it, but prioritize the user's specific notes.
    
    USER NOTES:
    "${noteContent || ""}"`;

        const promptText = `${systemContext}
    
    ## QUESTION TYPE INSTRUCTIONS (CRITICAL - FOLLOW EXACTLY):if in users prompt "frq" is mentioned then generate only "frq" questions. if in users prompt "single" is mentioned then generate only "single" questions. if in users prompt "multiple" is mentioned then generate only "multiple" questions. if in users prompt doesn't mention any type then generate a mix of "single", "multiple", and "frq" types for variety.
    
    ## GENERAL RULES:
    1. **NEVER leave correctAnswers empty** - Every question MUST have at least one correct answer.
    2. For "frq" questions:
       - Set \`options\` to an empty array []
       - Put the model answer in \`correctAnswers\` (REQUIRED - never leave empty)
       - The correctAnswers should contain a clear, complete answer
    3. For "single" questions:
       - Provide 4 options in the \`options\` array
       - Put exactly ONE correct answer in \`correctAnswers\`
    4. For "multiple" questions:
       - Provide 4 options in the \`options\` array
       - Put ALL correct answers (2 or more) in \`correctAnswers\`
    
    ## ANSWER VALIDATION:
    - ❌ INVALID: \`correctAnswers: []\` - This will break the quiz!
    - ✅ VALID: \`correctAnswers: ["The mitochondria is the powerhouse of the cell"]\`
    
    ## EXPLANATION FORMATTING:
    For Multiple Choice and Single Choice questions, the 'explanation' field MUST follow this exact structure:
    
    "✅ Correct: [Explain why the right answer is correct].
    
    ❌ Option [X]: [Explain why this specific distractor is wrong].
    ❌ Option [Y]: [Explain why this specific distractor is wrong]."
    
    For FRQ questions, explain why the model answer is correct and what key points it covers.
    
    Use newlines to make it readable. Do not just give a generic summary. Analyze every option.`;

        const {output} = await generateText({
            model: modelInstance,
            output: Output.object({schema:quizListSchema}),
            prompt: promptText,
        });

        return c.json(output.quizzes);
    } catch (error: any) {
        console.error("Error generating quizzes:", error);
        return c.json({ error: error.message || "Failed to generate quizzes" }, 500);
    }
});

aiRouter.post("/generate-flashcards", requireauth, async (c) => {
    try {
        const user = c.get("user");
        const { topic, numFlashcards, noteContent } = await c.req.json();
        
        if (!topic || !numFlashcards) return c.json({ error: "topic and numFlashcards required" }, 400);

        const modelInstance = await getBestSmallModelInstance(user.id);

        const {output } = await generateText({
            model: modelInstance,
            output: Output.object({schema:flashcardListSchema}),
            prompt: `You are an expert tutor creating study materials.
    
    TASK: Generate ${numFlashcards} flashcards about "${topic}".
    
    CONTEXT: Use the following notes as the primary source of truth. If the notes do not fully cover the topic, you may use your general knowledge to supplement it, but prioritize the user's specific notes.
    
    USER NOTES:
    "${noteContent || ""}"
    
    GUIDELINES:
    1. Questions should be clear and unambiguous.
    2. Answers should be concise (1-2 sentences) to fit on a card.
    3. Include a short 'explanation' only if the answer is complex.
    4. Vary the difficulty.`
        });

        return c.json(output.flashcards);
    } catch (error: any) {
        console.error("Error generating flashcards:", error);
        return c.json({ error: error.message || "Failed to generate flashcards" }, 500);
    }
});

aiRouter.post("/grade-flashcard", requireauth, async (c) => {
    try {
        const user = c.get("user");
        const { userAnswer, correctAnswer, question } = await c.req.json();
        
        if (!userAnswer || !correctAnswer || !question) return c.json({ error: "userAnswer, correctAnswer, and question are required" }, 400);

        const modelInstance = await getBestSmallModelInstance(user.id);

        const { output } = await generateText({
            model: modelInstance,
            output: Output.object({schema:GradeSchema}),
            prompt: `
      You are a supportive tutor speaking directly to a student.
      
      Question: "${question}"
      Official Answer: "${correctAnswer}"
      Student's Answer: "${userAnswer}"
      
      GRADING CRITERIA:
      - If the student captures the MAIN IDEA, mark as correct (even with different wording)
      - If they miss critical concepts or nuance, mark as incorrect
      - Be forgiving of typos and minor phrasing differences
      
      FEEDBACK STYLE:
      - Speak DIRECTLY to the student using "you" and "your"
      - Be encouraging and constructive
      - Examples:
        ✅ "Your answer shows understanding of..."
        ✅ "You correctly identified..."
        ✅ "You missed the key point about..."
        ❌ Avoid: "The student answer..." or "They forgot..."
      
      - Keep feedback concise (2-3 sentences max)
      - If incorrect, briefly explain what they missed without being harsh
      - If correct, affirm their understanding
      
      MISSED CONCEPTS:
      - Only list concepts if the answer is incorrect or incomplete
      - Use specific, actionable terms (not generic phrases)
      - Keep concepts short (3-7 words each)
    `
        });

        return c.json(output);
    } catch (error: any) {
        console.error("Error grading flashcard:", error);
        return c.json({ error: error.message || "Failed to grade flashcard" }, 500);
    }
});

export default aiRouter;
