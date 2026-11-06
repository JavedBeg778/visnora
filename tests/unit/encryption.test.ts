import { describe, it, expect } from 'vitest';
import {
  encryptCredential,
  decryptCredential,
} from '../../packages/shared/crypto/encryption';

describe('Credential Encryption (AES-256-GCM)', () => {
  const masterKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('encrypts and decrypts secrets matching original plaintext', () => {
    const secret = 'sk_test_mock_oauth_refresh_token_1234567890';
    const encrypted = encryptCredential(secret, masterKey);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv.length).toBe(12);
    expect(encrypted.authTag.length).toBe(16);

    const decrypted = decryptCredential(encrypted, masterKey);
    expect(decrypted).toBe(secret);
  });

  it('fails decryption if ciphertext or authTag is tampered with', () => {
    const secret = 'super_secret_payload';
    const encrypted = encryptCredential(secret, masterKey);

    // Tamper with the authentication tag
    encrypted.authTag[0] = (encrypted.authTag[0] ?? 0) ^ 0xff;

    expect(() => decryptCredential(encrypted, masterKey)).toThrow();
  });

  it('rejects master keys of invalid length', () => {
    expect(() => encryptCredential('test', 'short_key')).toThrow();
  });
});

