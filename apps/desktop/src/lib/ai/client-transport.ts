/**
 * Client-Side AI Transport — Custom transport for desktop.
 * 
 * Uses DefaultChatTransport with a custom `fetch` that intercepts the 
 * network call and instead runs streamText() directly in the browser.
 * 
 * This approach leverages the existing DefaultChatTransport infrastructure
 * (which handles stream parsing, reconnection, etc.) but replaces the 
 * actual HTTP call with local AI execution.
 */

import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  DefaultChatTransport,
  type UIMessage,
} from "ai";

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createXai } from "@ai-sdk/xai";
import { createMoonshotAI } from "@ai-sdk/moonshotai";

import { getLocalDecryptedKey } from "@/lib/services/localapikeys";
import { getUserSettings, DEFAULT_SYSTEM_PROMPT, getEffectiveSystemPrompt } from "@/lib/services/localusersettings";
import { getProviderForModel } from "@/lib/providers";
import { createClientTools } from "./client-tools";

// ─── Provider Factory ───────────────────────────────────────────

function createProviderInstance(providerId: string, apiKey: string) {
  switch (providerId) {
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
      return createMoonshotAI({ apiKey });
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

// ─── Error Parser ────────────────────────────────────────────────

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

// ─── Custom Fetch ────────────────────────────────────────────────

/**
 * Custom fetch function that intercepts the request and runs AI locally.
 * The DefaultChatTransport calls this instead of the real fetch().
 */
async function clientAiFetch(
  url: string | URL | Request,
  options?: RequestInit
): Promise<Response> {
  try {
    // Parse the request body sent by DefaultChatTransport
    const requestBody = JSON.parse(options?.body as string || "{}");
    
    const { messages: chatMessages, model: modelId, webSearch,contextFolder,
    contextNote,filecontext }:{messages:UIMessage[],model:string,webSearch:boolean,contextFolder?:{ id: string, name: string }[],contextNote?: { id: string, title: string }[],filecontext?:string} = requestBody;

    if (!modelId) {
      return new Response(
        JSON.stringify({ error: "No model selected. Please select a model in the chat." }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    } 

    // 1. Determine provider
    const provider = getProviderForModel(modelId);
    if (!provider) {
      return new Response(
        JSON.stringify({ error: `Unknown model: ${modelId}. Please select a valid model.` }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // 2. Get decrypted API key from Stronghold
    const apiKey = await getLocalDecryptedKey(provider.id);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `No API key configured for ${provider.name}. Add one in Settings → API Keys.` }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // 3. Get system prompt
    const systemPrompt = await getEffectiveSystemPrompt(webSearch,contextFolder,contextNote,filecontext);

    // 4. Create provider + model instance
    const providerInstance = createProviderInstance(provider.id, apiKey);
    const modelInstance = providerInstance(modelId);

    // 5. Create client-side tools
    const tools = createClientTools(modelInstance);

    // 6. Stream!
    const result = streamText({
      model: modelInstance,
      system: systemPrompt,
      tools,
      messages: await convertToModelMessages(chatMessages),
      stopWhen: stepCountIs(10),
      abortSignal: options?.signal ?? undefined,
    });

    // 7. Return the streaming Response (DefaultChatTransport parses this)
    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: true,
    });
  } catch (error: any) {
    console.error("[ClientTransport] AI streaming error:", error);

    const modelId = (() => {
      try { return JSON.parse(options?.body as string || "{}").model; }
      catch { return null; }
    })();
    const provider = modelId ? getProviderForModel(modelId) : null;
    const parsed = parseProviderError(error, provider?.name || "provider");

    return new Response(
      JSON.stringify({ error: parsed.message }),
      { status: parsed.status, headers: { "content-type": "application/json" } }
    );
  }
}

// ─── Transport Factory ──────────────────────────────────────────

/**
 * Creates a DefaultChatTransport with a custom fetch that runs AI locally.
 * The `api` URL is unused (never actually called) but required by the constructor.
 */
export function createClientTransport() {
  return new DefaultChatTransport({
    api: "/api/local-ai", // Placeholder — never actually fetched
    fetch: clientAiFetch as typeof globalThis.fetch,
  });
}
