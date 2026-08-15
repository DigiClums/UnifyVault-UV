import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Derives a 32-byte key buffer from secret.
 * Fails closed if PAYMENT_DATA_ENCRYPTION_KEY is missing or invalid.
 */
function getDerivedKey(customSecret?: string): Buffer {
  const secret =
    customSecret !== undefined ? customSecret : process.env.PAYMENT_DATA_ENCRYPTION_KEY;

  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    throw new Error('PAYMENT_DATA_ENCRYPTION_KEY is missing or invalid');
  }

  // Key length must be at least 16 characters for cryptographic safety
  if (secret.length < 16) {
    throw new Error('PAYMENT_DATA_ENCRYPTION_KEY is missing or invalid');
  }

  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive text (e.g. seller UPI ID) at rest using AES-256-GCM
 */
export function encryptData(text: string, customSecret?: string): string {
  if (!text) return '';
  const key = getDerivedKey(customSecret);
  const iv = crypto.randomBytes(12); // 96-bit IV
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Encrypted format: enc:iv:authTag:encryptedHex
  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted payload
 */
export function decryptData(encryptedPayload: string, customSecret?: string): string {
  if (!encryptedPayload || !encryptedPayload.startsWith('enc:')) {
    return encryptedPayload; // Return raw string if not encrypted
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) return encryptedPayload;

  const [, ivHex, authTagHex, encryptedHex] = parts;
  const key = getDerivedKey(customSecret);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
