export type ProviderModel = {
  id: string;
  name: string;
};

export type Provider = {
  id: string;
  name: string;
  icon: string;
  models: ProviderModel[];
  placeholder: string;
  description: string;
};

export const PROVIDERS: Provider[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "/chatgpt-icon.svg",
    models: [
      { id: "gpt-5.4-pro", name: "GPT-5.4 Pro" },
      { id: "gpt-5.4-nano", name: "GPT-5.4 Nano" },
      { id: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
      { id: "gpt-5.4", name: "GPT-5.4" },
      { id: "gpt-5.3-chat-latest", name: "GPT-5.3" },
      { id: "gpt-5.2-pro", name: "GPT-5.2 Pro" },
      { id: "gpt-5.2", name: "GPT-5.2" },
      { id: "gpt-5.1-chat-latest", name: "GPT-5.1" },
    ],
    placeholder: "sk-proj-...",
    description: "Access GPT-5.x series models from OpenAI",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "/claude-color.svg",
    models: [
      { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
      { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
    ],
    placeholder: "sk-ant-api03-...",
    description: "Access Claude models from Anthropic",
  },
  {
    id: "google",
    name: "Google",
    icon: "/gemini-color.svg",
    models: [
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro " },
      { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash" },
      { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
    ],
    placeholder: "AIza...",
    description: "Access Gemini models from Google AI",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "/deepseek-color.svg",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" },
    ],
    placeholder: "sk-...",
    description: "Access DeepSeek's reasoning and chat models",
  },
  {
    id: "xai",
    name: "xAI",
    icon: "/grok-icon.svg",
    models: [
      { id: "grok-4-1-fast-reasoning", name: "Grok 4.1 Fast Reasoning" },
      { id: "grok-4-1-fast-non-reasoning", name: "Grok 4.1 Fast Non-Reasoning" },
      { id: "grok-4-fast-reasoning", name: "Grok 4 Fast Reasoning" },
      { id: "grok-4-fast-non-reasoning", name: "Grok 4 Fast Non-Reasoning" },
      { id: "grok-4", name: "Grok 4" },
      { id: "grok-3", name: "Grok 3" },
    ],
    placeholder: "xai-...",
    description: "Access Grok models from xAI",
  },
  {
    id: "moonshot",
    name: "Moonshot",
    icon: "/kimi-color.svg",
    models: [
      { id: "kimi-k2.5", name: "Kimi K2.5" },
      { id: "kimi-k2", name: "Kimi K2" },
    ],
    placeholder: "sk-...",
    description: "Access Moonshot (Kimi) chat models",
  },
];

export const TAVILY_PROVIDER = {
  id: "tavily",
  name: "Tavily",
  icon: "",
  placeholder: "tvly-...",
  description: "Required for web search functionality in chat",
};

/** Get all available models for providers that have configured keys */
export function getAvailableModels(configuredProviders: string[]): { provider: string; providerIcon: string; model: ProviderModel }[] {
  const models: { provider: string; providerIcon: string; model: ProviderModel }[] = [];
  for (const provider of PROVIDERS) {
    if (configuredProviders.includes(provider.id)) {
      for (const model of provider.models) {
        models.push({ provider: provider.id, providerIcon: provider.icon, model });
      }
    }
  }
  return models;
}

/** Get provider name from a model ID */
export function getProviderForModel(modelId: string): Provider | undefined {
  return PROVIDERS.find(p => p.models.some(m => m.id === modelId));
}
