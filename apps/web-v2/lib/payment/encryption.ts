import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY =
  process.env.PAYMENT_DATA_ENCRYPTION_KEY ||
  'unifyvault-p2p-payment-secret-key-32b!!-secure-at-rest';

/**
 * Derives a 32-byte key buffer from secret
 */
function getDerivedKey(): Buffer {
  return crypto.createHash('sha256').update(SECRET_KEY).digest();
}

/**
 * Encrypts sensitive text (e.g. seller UPI ID) at rest using AES-256-GCM
 */
export function encryptData(text: string): string {
  if (!text) return '';
  const key = getDerivedKey();
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
export function decryptData(encryptedPayload: string): string {
  if (!encryptedPayload || !encryptedPayload.startsWith('enc:')) {
    return encryptedPayload; // Return raw string if not encrypted
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) return encryptedPayload;

  const [, ivHex, authTagHex, encryptedHex] = parts;
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
