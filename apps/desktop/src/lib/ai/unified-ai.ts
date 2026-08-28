import { z } from "zod";
import { generateText, Output } from "ai";
import { getApiKeysMeta, getLocalDecryptedKey } from "../services/localapikeys";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createXai } from "@ai-sdk/xai";
import { createMoonshotAI } from "@ai-sdk/moonshotai";
import { getProviderForModel } from "../providers";

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

// --- HELPER: LOCAL MODEL PICKER ---

function createProviderInstance(providerId: string, apiKey: string) {
  switch (providerId) {
    case "openai": return createOpenAI({ apiKey });
    case "anthropic": return createAnthropic({ apiKey });
    case "google": return createGoogleGenerativeAI({ apiKey });
    case "deepseek": return createDeepSeek({ apiKey });
    case "xai": return createXai({ apiKey });
    case "moonshot": return createMoonshotAI({ apiKey });
    default: throw new Error(`Unsupported provider: ${providerId}`);
  }
}

const PREFERRED_SMALL_MODELS = [
  { provider: "google", model: "gemini-2.5-flash" },
  { provider: "openai", model: "gpt-4o-mini" },
  { provider: "anthropic", model: "claude-haiku-4-5" },
  { provider: "xai", model: "grok-3" },
  { provider: "moonshot", model: "kimi-k2" },
  { provider: "deepseek", model: "deepseek-chat" },
];

async function getBestLocalSmallModelInstance() {
  const keys = await getApiKeysMeta();
  const validKeys = keys.filter(k => k.isValid);
  if (validKeys.length === 0) throw new Error("No valid API keys configured");

  for (const pref of PREFERRED_SMALL_MODELS) {
    const keyRecord = validKeys.find(k => k.provider === pref.provider);
    if (keyRecord) {
      const apiKey = await getLocalDecryptedKey(pref.provider);
      if (apiKey) {
        let actualModelId = pref.model;
        if (pref.model === "gpt-4o-mini") actualModelId = "gpt-5.4-mini"; // app naming

        const providerInstance = createProviderInstance(pref.provider, apiKey);
        return providerInstance(actualModelId);
      }
    }
  }

  // Fallback
  const fallbackKey = validKeys[0];
  const apiKey = await getLocalDecryptedKey(fallbackKey.provider);
  if (!apiKey) throw new Error("Could not decrypt API key");
  
  // Try to find any model for this provider in the app's config
  // For safety, just request a default model name that the provider might support
  let fallbackModel = "default";
  if (fallbackKey.provider === "openai") fallbackModel = "gpt-5.4-mini";
  if (fallbackKey.provider === "google") fallbackModel = "gemini-3-flash-preview";

  return createProviderInstance(fallbackKey.provider, apiKey)(fallbackModel);
}

// --- UNIFIED API WRAPPERS ---

export async function generateQuizzesAction(topic: string, numQuestions: number, noteContent: string = "") {
    // Desktop: run locally
  const modelInstance = await getBestLocalSmallModelInstance();

  const systemContext = `You are an expert tutor creating study materials.
    TASK: Generate exactly ${numQuestions} distinct practice problems .user's prompt "${topic}"
    CONTEXT: Use the following notes as the primary source of truth. If the notes do not fully cover the topic, you may use your general knowledge to supplement it, but prioritize the user's specific notes.
    
    USER NOTES:
    "${noteContent}"`;

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

  const { output } = await generateText({
    model: modelInstance,
    output: Output.object({schema:quizListSchema}),
    prompt: promptText,
  });

  return output.quizzes;
}

export async function generateFlashcardsAction(topic: string, numFlashcards: number, noteContent: string = "") {
  // Desktop: run locally
  const modelInstance = await getBestLocalSmallModelInstance();

  const { output } = await generateText({
    model: modelInstance,
    output: Output.object({schema:flashcardListSchema}),
    prompt: `You are an expert tutor creating study materials.
    
    TASK: Generate ${numFlashcards} flashcards about "${topic}".
    
    CONTEXT: Use the following notes as the primary source of truth. If the notes do not fully cover the topic, you may use your general knowledge to supplement it, but prioritize the user's specific notes.
    
    USER NOTES:
    "${noteContent}"
    
    GUIDELINES:
    1. Questions should be clear and unambiguous.
    2. Answers should be concise (1-2 sentences) to fit on a card.
    3. Include a short 'explanation' only if the answer is complex.
    4. Vary the difficulty.`
  });

  return output.flashcards;
}

export async function gradeFlashcardAnswer(userAnswer: string, correctAnswer: string, question: string) {
  // Desktop: run locally
  const modelInstance = await getBestLocalSmallModelInstance();

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

  return output;
}

// ============================================
// HELPERS FOR VIDEO GENERATION (desktop)
// ============================================

/**
 * Get a model instance for a specific model ID (e.g. "gemini-3-flash-preview").
 * Used by the video generation modal when user picks a specific model.
 */
export async function getModelForGeneration(modelId: string) {
  try {
    const provider = getProviderForModel(modelId);
    if (!provider) return null;
    const apiKey = await getLocalDecryptedKey(provider.id);
    if (!apiKey) return null;
    return createProviderInstance(provider.id, apiKey)(modelId);
  } catch {
    return null;
  }
}

/**
 * Get any available model instance for retrying (fixing failed code).
 * Picks the best small model from user's configured keys.
 */
export async function getModelForRetry(preferredModelId?: string) {
  try {
    // Try the preferred model first
    if (preferredModelId) {
      const instance = await getModelForGeneration(preferredModelId);
      if (instance) return instance;
    }
    // Fall back to best small model
    return await getBestLocalSmallModelInstance();
  } catch {
    return null;
  }
}
