import { eq } from "drizzle-orm";
import { getLocalDb } from "../localdb";
import { apiKeyMeta } from "../schema.local";
import { Stronghold } from '@tauri-apps/plugin-stronghold';

const VAULT_PATH = import.meta.env.DEV
    ? 'foldex-vault-dev.bin' 
    : 'foldex-vault.bin';
const VAULT_PASS = 'foldex-vault-local-password'; // local default vault password
const CLIENT_NAME = 'foldex_client_local';

async function getStore() {
    const stronghold = await Stronghold.load(VAULT_PATH, VAULT_PASS);
    let client;
    try {
        client = await stronghold.loadClient(CLIENT_NAME);
    } catch (e) {
        client = await stronghold.createClient(CLIENT_NAME);
    }
    return { store: client.getStore(), stronghold };
}

export const getApiKeysMeta = async () => {
    try {
        const db = await getLocalDb();
        const keys = await db.select().from(apiKeyMeta);
        return keys;
    } catch (error) {
        console.error("error getting api key metadata", error);
        return [];
    }
};

export function maskKey(rawKey: string): string {
    if (rawKey.length <= 8) return "****";
    const prefix = rawKey.slice(0, 4);
    const suffix = rawKey.slice(-4);
    return `${prefix}...${suffix}`;
}

export const saveApiKeyMeta = async (provider: string, key: string) => {
    try {
        const { store, stronghold } = await getStore();
        
        // Save actual key in Stronghold
        const keyBytes = Array.from(new TextEncoder().encode(key));
        await store.insert(`apikey_${provider}`, keyBytes);
        await stronghold.save();

        const displayHint = maskKey(key);

        const db = await getLocalDb();
        const [existing] = await db.select().from(apiKeyMeta).where(eq(apiKeyMeta.provider, provider));

        if (existing) {
            const [updated] = await db.update(apiKeyMeta).set({
                displayHint,
                isValid: true,
                updatedAt: new Date()
            }).where(eq(apiKeyMeta.provider, provider)).returning();
            return updated;
        }

        const [created] = await db.insert(apiKeyMeta).values({
            provider,
            displayHint,
            isValid: true,
        }).returning();
        return created;
    } catch (error) {
        console.error("error saving api key", error);
        throw error;
    }
};

export const deleteApiKeyMeta = async (provider: string) => {
    try {
        const { store, stronghold } = await getStore();
        // Stronghold remove can throw if key doesn't exist — that's fine
        try {
            await store.remove(`apikey_${provider}`);
            await stronghold.save();
        } catch (e) {
            console.warn(`[deleteApiKey] Stronghold remove failed for ${provider} (may not exist):`, e);
        }

        const db = await getLocalDb();
        await db.delete(apiKeyMeta).where(eq(apiKeyMeta.provider, provider));
        return { success: true };
    } catch (error) {
        console.error("error deleting api key", error);
        throw error;
    }
};

export const updateApiKeyValidity = async (provider: string, isValid: boolean) => {
    try {
        const db = await getLocalDb();
        await db.update(apiKeyMeta).set({
            isValid,
            updatedAt: new Date()
        }).where(eq(apiKeyMeta.provider, provider));
    } catch (error) {
        console.error("error updating api key validity", error);
        throw error;
    }
};

// ─── Validation ───

export const getLocalDecryptedKey = async (provider: string): Promise<string | null> => {
    try {
        const { store } = await getStore();
        const keyBytes = await store.get(`apikey_${provider}`);
        if (!keyBytes) return null;
        return new TextDecoder().decode(new Uint8Array(keyBytes));
    } catch (error) {
        console.error("error getting decrypted key", error);
        return null;
    }
};

export const validateLocalApiKey = async (provider: string) => {
    try {
        const rawKey = await getLocalDecryptedKey(provider);
        if (!rawKey) {
            return { valid: false, error: `No API key configured for ${provider}` };
        }

        let valid = false;
        let errorMessage: string | undefined;

        try {
            switch (provider) {
                case "openai":
                    await validateOpenAI(rawKey);
                    valid = true;
                    break;
                case "anthropic":
                    await validateAnthropic(rawKey);
                    valid = true;
                    break;
                case "google":
                    await validateGoogle(rawKey);
                    valid = true;
                    break;
                case "deepseek":
                    await validateOpenAICompatible(rawKey, "https://api.deepseek.com/v1/models");
                    valid = true;
                    break;
                case "xai":
                    await validateOpenAICompatible(rawKey, "https://api.x.ai/v1/models");
                    valid = true;
                    break;
                case "moonshot":
                    await validateOpenAICompatible(rawKey, "https://api.moonshot.cn/v1/models");
                    valid = true;
                    break;
                case "tavily":
                    await validateTavily(rawKey);
                    valid = true;
                    break;
                default:
                    errorMessage = "Validation not supported for this provider";
            }
        } catch (e: any) {
            valid = false;
            errorMessage = e.message || "Key validation failed";
        }

        await updateApiKeyValidity(provider, valid);
        return { valid, error: errorMessage };
    } catch (error) {
        console.error("error validating api key", error);
        return { valid: false, error: "Validation failed" };
    }
};

async function validateOpenAI(key: string) {
    const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `OpenAI returned ${res.status}`);
    }
}

async function validateAnthropic(key: string) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
        }),
    });
    if (res.status === 401 || res.status === 403) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Invalid Anthropic API key");
    }
}

async function validateGoogle(key: string) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (!res.ok) {
        throw new Error(`Google AI returned ${res.status} — key may be invalid`);
    }
}

async function validateOpenAICompatible(key: string, url: string) {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
        throw new Error(`Provider returned ${res.status} — key may be invalid`);
    }
}

async function validateTavily(key: string) {
    const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            api_key: key,
            query: "test",
            max_results: 1,
        }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Tavily returned ${res.status}`);
    }
}
