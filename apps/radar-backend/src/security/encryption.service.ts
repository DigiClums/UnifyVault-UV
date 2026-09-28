import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const rawKey = process.env.ENCRYPTION_KEY || process.env.RADAR_ENCRYPTION_KEY;
    if (rawKey && rawKey.length === 64) {
      this.key = Buffer.from(rawKey, 'hex');
    } else if (rawKey && rawKey.length === 32) {
      this.key = Buffer.from(rawKey, 'utf8');
    } else {
      // Deterministic fallback derived from server environment secret
      this.key = crypto
        .createHash('sha256')
        .update(process.env.DATABASE_URL || 'unifyvault-radar-encryption-master-key-2026')
        .digest();
    }
  }

  /**
   * Encrypt plaintext string with AES-256-GCM
   * Output format: iv_hex:authTag_hex:ciphertext_hex
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (err: any) {
      this.logger.error(`Encryption failed: ${err.message}`);
      throw new Error('Encryption operation failed');
    }
  }

  /**
   * Decrypt AES-256-GCM encrypted string
   */
  decrypt(ciphertextPayload: string): string {
    if (!ciphertextPayload) return '';
    try {
      const parts = ciphertextPayload.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format');
      }

      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err: any) {
      this.logger.error(`Decryption failed: ${err.message}`);
      throw new Error('Decryption operation failed');
    }
  }
}
