import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error("ENCRYPTION_KEY env variable is required (32-byte hex string, 64 hex chars)");
    }
    const buf = Buffer.from(key, "hex");
    if (buf.length !== 32) {
        throw new Error("ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)");
    }
    return buf;
}

export function encryptKey(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    const key = getEncryptionKey();
    const iv = randomBytes(12); // 96-bit IV for GCM
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return {
        encrypted,
        iv: iv.toString("hex"),
        authTag,
    };
}

export function decryptKey(encrypted: string, iv: string, authTag: string): string {
    const key = getEncryptionKey();
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

/** Create a display hint like "sk-...ab3f" from a raw key */
export function maskKey(rawKey: string): string {
    if (rawKey.length <= 8) return "****";
    const prefix = rawKey.slice(0, 4);
    const suffix = rawKey.slice(-4);
    return `${prefix}...${suffix}`;
}
