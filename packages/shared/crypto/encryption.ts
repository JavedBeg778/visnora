// Visnora — Cryptographic Credential Vault (AES-256-GCM)

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

export interface EncryptedPayload {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * Encrypts a sensitive string (e.g. OAuth token or API key) using AES-256-GCM.
 * Requires a 32-byte hexadecimal master key.
 */
export function encryptCredential(
  plaintext: string,
  masterKeyHex: string
): EncryptedPayload {
  const key = Buffer.from(masterKeyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('Invalid encryption key: Master key must be 32 bytes (64 hex characters).');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv,
    authTag,
  };
}

/**
 * Decrypts an encrypted credential payload.
 */
export function decryptCredential(
  payload: EncryptedPayload,
  masterKeyHex: string
): string {
  const key = Buffer.from(masterKeyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('Invalid encryption key: Master key must be 32 bytes (64 hex characters).');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, payload.iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(payload.authTag);

  const decrypted = Buffer.concat([
    decipher.update(payload.ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

