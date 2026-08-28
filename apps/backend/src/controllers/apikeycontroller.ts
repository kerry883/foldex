import { Context } from "hono";
import { db } from "../lib/db";
import { apiKeys } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { encryptKey, decryptKey, maskKey } from "../lib/crypto";
import z from "zod";

const SUPPORTED_PROVIDERS = ["openai", "anthropic", "google", "deepseek", "xai", "moonshot", "tavily"] as const;

const saveKeySchema = z.object({
    provider: z.enum(SUPPORTED_PROVIDERS),
    key: z.string().min(1, "API key is required"),
});

/** Save or update an API key for a provider */
export const saveApiKey = async (c: Context) => {
    try {
        const user = c.get("user");
        const body = await c.req.json();
        const parsed = saveKeySchema.parse(body);

        const { encrypted, iv, authTag } = encryptKey(parsed.key);
        const displayHint = maskKey(parsed.key);

        // Upsert: check if key exists for this user+provider
        const [existing] = await db.select()
            .from(apiKeys)
            .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, parsed.provider)));

        if (existing) {
            const [updated] = await db.update(apiKeys).set({
                encryptedKey: encrypted,
                iv,
                authTag,
                displayHint,
                isValid: true, // reset validation on save
                updatedAt: new Date(),
            }).where(eq(apiKeys.id, existing.id)).returning();

            return c.json({
                provider: updated.provider,
                displayHint: updated.displayHint,
                isValid: updated.isValid,
                updatedAt: updated.updatedAt,
            }, 200);
        }

        const [created] = await db.insert(apiKeys).values({
            userId: user.id,
            provider: parsed.provider,
            encryptedKey: encrypted,
            iv,
            authTag,
            displayHint,
        }).returning();

        return c.json({
            provider: created.provider,
            displayHint: created.displayHint,
            isValid: created.isValid,
            updatedAt: created.updatedAt,
        }, 201);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return c.json({ error: error.message }, 400);
        }
        console.error("Error saving API key:", error);
        return c.json({ error: "Failed to save API key" }, 500);
    }
};

/** List all configured API keys (masked, never raw keys) */
export const listApiKeys = async (c: Context) => {
    try {
        const user = c.get("user");
        const keys = await db.select({
            provider: apiKeys.provider,
            displayHint: apiKeys.displayHint,
            isValid: apiKeys.isValid,
            updatedAt: apiKeys.updatedAt,
        }).from(apiKeys).where(eq(apiKeys.userId, user.id));

        return c.json(keys, 200);
    } catch (error) {
        console.error("Error listing API keys:", error);
        return c.json({ error: "Failed to list API keys" }, 500);
    }
};

/** Delete a key for a specific provider */
export const deleteApiKey = async (c: Context) => {
    try {
        const user = c.get("user");
        const provider = c.req.param("provider");

        if (!provider) {
            return c.json({ error: "Provider is required" }, 400);
        }

        if (!SUPPORTED_PROVIDERS.includes(provider as any)) {
            return c.json({ error: "Invalid provider" }, 400);
        }

        await db.delete(apiKeys).where(
            and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, provider))
        );

        return c.json({ success: true }, 200);
    } catch (error) {
        console.error("Error deleting API key:", error);
        return c.json({ error: "Failed to delete API key" }, 500);
    }
};

/** Validate a stored key by making a lightweight API call to the provider */
export const validateApiKey = async (c: Context) => {
    try {
        const user = c.get("user");
        const provider = c.req.param("provider");

        if(!provider){
            return c.json({ error: "Provider is required" }, 400);
        }


        if (!SUPPORTED_PROVIDERS.includes(provider as any)) {
            return c.json({ error: "Invalid provider" }, 400);
        }

        const [keyRecord] = await db.select()
            .from(apiKeys)
            .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, provider)));

        if (!keyRecord) {
            return c.json({ error: `No API key configured for ${provider}` }, 404);
        }

        const rawKey = decryptKey(keyRecord.encryptedKey, keyRecord.iv, keyRecord.authTag);

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

        // Update validity in DB
        await db.update(apiKeys).set({
            isValid: valid,
            updatedAt: new Date(),
        }).where(eq(apiKeys.id, keyRecord.id));

        return c.json({ valid, error: errorMessage }, 200);
    } catch (error) {
        console.error("Error validating API key:", error);
        return c.json({ error: "Failed to validate API key" }, 500);
    }
};

// ─── Validation helpers ───

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
    // 200 or 400 (bad request) means the key is valid, only 401 means invalid
    if (res.status === 401 || res.status === 403) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Invalid Anthropic API key");
    }
}

async function validateGoogle(key: string) {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    );
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

/** Internal: get decrypted key for a user+provider. Used by AI route. */
export async function getDecryptedKey(userId: string, provider: string): Promise<string | null> {
    const [keyRecord] = await db.select()
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)));

    if (!keyRecord) return null;

    return decryptKey(keyRecord.encryptedKey, keyRecord.iv, keyRecord.authTag);
}
