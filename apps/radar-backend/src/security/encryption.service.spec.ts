import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  it('should encrypt and decrypt a sensitive token accurately', () => {
    const originalToken = 'x_oauth2_access_token_secret_example_1234567890';
    const encrypted = service.encrypt(originalToken);

    expect(encrypted).not.toBe(originalToken);
    expect(encrypted).toContain(':');
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:ciphertext

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('should handle empty or null values safely', () => {
    expect(service.encrypt('')).toBe('');
    expect(service.decrypt('')).toBe('');
  });

  it('should fail with error if encrypted payload has been tampered with', () => {
    const originalToken = 'my_secret_token';
    const encrypted = service.encrypt(originalToken);
    const parts = encrypted.split(':');
    // Tamper ciphertext
    parts[2] = parts[2].slice(0, -2) + 'ff';
    const tampered = parts.join(':');

    expect(() => service.decrypt(tampered)).toThrow('Decryption operation failed');
  });
});
