/**
 * ai-providers.ts — Shared AI provider factory.
 * 
 * Extracted from airoute.ts so that both the AI chat route and the 
 * video controller can create model instances from provider + key + modelId.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createMoonshotAI } from "@ai-sdk/moonshotai";
import type { LanguageModel } from "ai";

/**
 * Create a provider factory from a provider name and API key.
 * Returns a callable that takes a model ID and returns a LanguageModel.
 */
export function createProviderFactory(provider: string, apiKey: string) {
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
            return createMoonshotAI({ apiKey });
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

/**
 * Create a LanguageModel instance directly from provider + key + modelId.
 * Convenience wrapper around createProviderFactory.
 */
export function getProviderInstance(provider: string, apiKey: string, modelId: string): LanguageModel {
    const factory = createProviderFactory(provider, apiKey);
    return factory(modelId) as LanguageModel;
}
