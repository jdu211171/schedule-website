import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const algorithm = "aes-256-gcm";
const salt = "salt"; // In production, use a proper salt management strategy

/**
 * Get encryption key from environment variable
 * Falls back to AUTH_SECRET if ENCRYPTION_KEY is not set
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("ENCRYPTION_KEY or AUTH_SECRET must be set for encryption");
  }

  // Derive a 32-byte key from the secret
  return scryptSync(secret, salt, 32);
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine iv, authTag, and encrypted data
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a string is encrypted (has the expected format)
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split(":");
  return (
    parts.length === 3 &&
    parts[0].length === 32 && // IV is 16 bytes = 32 hex chars
    parts[1].length === 32 && // Auth tag is 16 bytes = 32 hex chars
    parts[2].length > 0
  ); // Encrypted data exists
}
