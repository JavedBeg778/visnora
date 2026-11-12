// Visnora — OpenAI Ads Credential Vault
// Handles AES-256-GCM encryption/decryption of Advertiser API keys, key scrubbing, and validation

import { encryptCredential, decryptCredential } from '../../shared/crypto/encryption';

export interface StoredCredentialFields {
  encryptedKey: string;
  iv: string;
  authTag: string;
  keyPrefix: string;
  lastFour: string;
}

/**
 * Retrieves the 32-byte hexadecimal encryption key from environment variables.
 * Throws a descriptive configuration error if missing or invalid.
 */
export function getAdsMasterKey(): string {
  const key =
    process.env.OPENAI_ADS_ENCRYPTION_KEY ||
    process.env.APP_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'Missing encryption secret: OPENAI_ADS_ENCRYPTION_KEY or APP_ENCRYPTION_KEY must be configured in environment variables.'
    );
  }

  const cleanKey = key.trim();
  if (cleanKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    throw new Error(
      'Invalid encryption key length: Master key must be a 64-character hexadecimal string (32 bytes).'
    );
  }

  return cleanKey;
}

/**
 * Encrypts an OpenAI Ads API key using AES-256-GCM.
 */
export function encryptAdsApiKey(apiKey: string): StoredCredentialFields {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    throw new Error('Invalid API key: Key must be a non-empty string.');
  }

  const trimmed = apiKey.trim();
  const masterKey = getAdsMasterKey();

  const payload = encryptCredential(trimmed, masterKey);

  const prefixLength = Math.min(trimmed.length > 12 ? 8 : 4, trimmed.length - 4);
  const keyPrefix = trimmed.slice(0, prefixLength);
  const lastFour = trimmed.slice(-4);

  return {
    encryptedKey: payload.ciphertext.toString('hex'),
    iv: payload.iv.toString('hex'),
    authTag: payload.authTag.toString('hex'),
    keyPrefix,
    lastFour,
  };
}

/**
 * Decrypts an encrypted credential record back into plaintext API key.
 */
export function decryptAdsApiKey(fields: {
  encryptedKey: string;
  iv: string;
  authTag: string;
}): string {
  const masterKey = getAdsMasterKey();

  return decryptCredential(
    {
      ciphertext: Buffer.from(fields.encryptedKey, 'hex'),
      iv: Buffer.from(fields.iv, 'hex'),
      authTag: Buffer.from(fields.authTag, 'hex'),
    },
    masterKey
  );
}

/**
 * Safely scrubs an API key for logs or display: "oa_ads_...9a2f".
 */
export function scrubAdsApiKey(apiKey?: string | null): string {
  if (!apiKey) return '[REDACTED]';
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return '[REDACTED]';
  const prefix = trimmed.slice(0, 6);
  const suffix = trimmed.slice(-4);
  return `${prefix}...${suffix}`;
}

