// Visnora — ChatGPT Ads Account Management Service
// Multi-tenant, credential-vault protected, entitlement-guarded

import { prisma } from '../../database/src/client';
import {
  encryptAdsApiKey,
  decryptAdsApiKey,
  scrubAdsApiKey,
  OpenAiAdsClient,
} from '../../integrations/openai-ads';
import { assertEntitlement, getOrganizationEntitlements } from '../billing/entitlements';
import { ConnectAccountInput, AccountView } from './types';

export class AdsAccountLimitError extends Error {
  constructor(current: number, limit: number) {
    super(
      `Connected ChatGPT Ads account limit reached (${current}/${limit}). Upgrade your subscription plan to connect additional advertiser accounts.`
    );
    this.name = 'AdsAccountLimitError';
  }
}

export class AdsAccountNotFoundError extends Error {
  constructor(id: string) {
    super(`ChatGPT Ads account "${id}" not found or unauthorized.`);
    this.name = 'AdsAccountNotFoundError';
  }
}

function formatMaskedKey(keyPrefix: string, lastFour: string): string {
  return `${keyPrefix}...${lastFour}`;
}

/**
 * Connects and securely vaults a customer's OpenAI Ads advertiser account.
 */
export async function connectAccount(input: ConnectAccountInput, actorUserId?: string): Promise<AccountView> {
  const { organizationId, name, openaiAccountId, apiKey, currency = 'USD', timezone = 'UTC' } = input;

  // 1. Entitlement Guard
  await assertEntitlement(organizationId, 'chatgpt_ads_intelligence');

  // 2. Quota Check for multi-account limit
  const entitlements = await getOrganizationEntitlements(organizationId);
  const limit = entitlements.connectedAdsAccountsLimit ?? 1;

  const existingCount = await prisma.chatGPTAdsAccount.count({
    where: {
      organizationId,
      status: { not: 'DISCONNECTED' },
    },
  });

  if (existingCount >= limit) {
    throw new AdsAccountLimitError(existingCount, limit);
  }

  // 3. Encrypt the raw API key securely; mask it for display and audit logs
  const rawKey = apiKey.trim();
  const encrypted = encryptAdsApiKey(rawKey);

  // 4. Verify Account with OpenAI Ads Client using valid API key
  let isVerified = false;
  let clientError: string | null = null;

  try {
    const client = new OpenAiAdsClient({ apiKey: rawKey });
    const verifyResult = await client.verifyAccount();
    isVerified = !!verifyResult?.id;
  } catch (err: any) {
    clientError = err.message || 'Verification failed';
    isVerified = false;
  }

  // 5. Persist Account and Credential in Database Transaction
  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.chatGPTAdsAccount.create({
      data: {
        organizationId,
        name,
        openaiAccountId,
        currency,
        timezone,
        status: isVerified ? 'CONNECTED' : (clientError ? 'ERROR' : 'CONNECTED'),
        reviewStatus: isVerified ? 'APPROVED' : 'PENDING_VERIFICATION',
        syncError: clientError,
        dataFreshnessInfo: { verified: isVerified, verifiedAt: new Date().toISOString() },
      },
    });

    const credential = await tx.chatGPTAdsCredential.create({
      data: {
        organizationId,
        accountId: account.id,
        encryptedKey: encrypted.encryptedKey,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyPrefix: encrypted.keyPrefix,
        lastFour: encrypted.lastFour,
        status: 'ACTIVE',
      },
    });

    await tx.chatGPTAdsAuditLog.create({
      data: {
        organizationId,
        accountId: account.id,
        action: 'ACCOUNT_CONNECTED',
        targetType: 'ACCOUNT',
        targetId: account.id,
        actorUserId: actorUserId || null,
        newState: {
          openaiAccountId,
          isVerified,
          keyPrefix: credential.keyPrefix,
          lastFour: credential.lastFour,
        },
      },
    });

    return { account, credential };
  });

  return {
    id: result.account.id,
    organizationId: result.account.organizationId,
    name: result.account.name,
    openaiAccountId: result.account.openaiAccountId,
    currency: result.account.currency,
    timezone: result.account.timezone,
    status: result.account.status,
    reviewStatus: result.account.reviewStatus,
    lastSyncAt: result.account.lastSyncAt,
    maskedKey: formatMaskedKey(result.credential.keyPrefix, result.credential.lastFour),
    createdAt: result.account.createdAt,
    updatedAt: result.account.updatedAt,
  };
}

/**
 * Lists all ChatGPT Ads accounts for the given organization.
 */
export async function listAccounts(organizationId: string): Promise<AccountView[]> {
  const accounts = await prisma.chatGPTAdsAccount.findMany({
    where: { organizationId },
    include: {
      credentials: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return accounts.map((acc) => {
    const cred = acc.credentials[0];
    return {
      id: acc.id,
      organizationId: acc.organizationId,
      name: acc.name,
      openaiAccountId: acc.openaiAccountId,
      currency: acc.currency,
      timezone: acc.timezone,
      status: acc.status,
      reviewStatus: acc.reviewStatus,
      lastSyncAt: acc.lastSyncAt,
      maskedKey: cred ? formatMaskedKey(cred.keyPrefix, cred.lastFour) : null,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    };
  });
}

/**
 * Gets account details by ID with tenant isolation verification.
 */
export async function getAccount(organizationId: string, accountId: string): Promise<AccountView> {
  const acc = await prisma.chatGPTAdsAccount.findFirst({
    where: { id: accountId, organizationId },
    include: {
      credentials: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
    },
  });

  if (!acc) {
    throw new AdsAccountNotFoundError(accountId);
  }

  const cred = acc.credentials[0];

  return {
    id: acc.id,
    organizationId: acc.organizationId,
    name: acc.name,
    openaiAccountId: acc.openaiAccountId,
    currency: acc.currency,
    timezone: acc.timezone,
    status: acc.status,
    reviewStatus: acc.reviewStatus,
    lastSyncAt: acc.lastSyncAt,
    maskedKey: cred ? formatMaskedKey(cred.keyPrefix, cred.lastFour) : null,
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
  };
}

/**
 * Retrieves an initialized OpenAiAdsClient with decrypted credentials for internal domain operations.
 */
export async function getClientForAccount(organizationId: string, accountId: string): Promise<OpenAiAdsClient> {
  const acc = await prisma.chatGPTAdsAccount.findFirst({
    where: { id: accountId, organizationId },
    include: {
      credentials: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
    },
  });

  if (!acc) {
    throw new AdsAccountNotFoundError(accountId);
  }

  const cred = acc.credentials[0];
  if (!cred) {
    throw new Error(`Active credentials not found for account "${accountId}".`);
  }

  const rawApiKey = decryptAdsApiKey({
    encryptedKey: cred.encryptedKey,
    iv: cred.iv,
    authTag: cred.authTag,
  });

  return new OpenAiAdsClient({
    apiKey: rawApiKey,
  });
}

/**
 * Disconnects an account and revokes associated credentials.
 */
export async function disconnectAccount(organizationId: string, accountId: string, actorUserId?: string): Promise<void> {
  const acc = await prisma.chatGPTAdsAccount.findFirst({
    where: { id: accountId, organizationId },
  });

  if (!acc) {
    throw new AdsAccountNotFoundError(accountId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.chatGPTAdsAccount.update({
      where: { id: accountId },
      data: {
        status: 'DISCONNECTED',
      },
    });

    await tx.chatGPTAdsCredential.updateMany({
      where: { accountId },
      data: { status: 'REVOKED' },
    });

    await tx.chatGPTAdsAuditLog.create({
      data: {
        organizationId,
        accountId,
        action: 'ACCOUNT_DISCONNECTED',
        targetType: 'ACCOUNT',
        targetId: accountId,
        actorUserId: actorUserId || null,
      },
    });
  });
}

/**
 * Rotates the API key for an existing account.
 */
export async function rotateApiKey(
  organizationId: string,
  accountId: string,
  newApiKey: string,
  actorUserId?: string
): Promise<{ maskedKey: string }> {
  const acc = await prisma.chatGPTAdsAccount.findFirst({
    where: { id: accountId, organizationId },
    include: {
      credentials: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
    },
  });

  if (!acc) {
    throw new AdsAccountNotFoundError(accountId);
  }

  const currentCred = acc.credentials[0];
  const cleanKey = scrubAdsApiKey(newApiKey);
  const encrypted = encryptAdsApiKey(cleanKey);

  // Test new credentials with client
  const client = new OpenAiAdsClient({ apiKey: cleanKey });
  let isValid = false;
  try {
    const verifyResult = await client.verifyAccount();
    isValid = !!verifyResult?.id;
  } catch {
    isValid = false;
  }

  await prisma.$transaction(async (tx) => {
    if (currentCred) {
      await tx.chatGPTAdsCredential.update({
        where: { id: currentCred.id },
        data: { status: 'REVOKED' },
      });
    }

    await tx.chatGPTAdsCredential.create({
      data: {
        organizationId,
        accountId,
        encryptedKey: encrypted.encryptedKey,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyPrefix: encrypted.keyPrefix,
        lastFour: encrypted.lastFour,
        status: 'ACTIVE',
        rotatedAt: new Date(),
      },
    });

    await tx.chatGPTAdsAccount.update({
      where: { id: accountId },
      data: {
        status: isValid ? 'CONNECTED' : 'ERROR',
      },
    });

    await tx.chatGPTAdsAuditLog.create({
      data: {
        organizationId,
        accountId,
        action: 'KEY_ROTATED',
        targetType: 'CREDENTIAL',
        targetId: accountId,
        actorUserId: actorUserId || null,
        newState: {
          keyPrefix: encrypted.keyPrefix,
          lastFour: encrypted.lastFour,
          isValid,
        },
      },
    });
  });

  return {
    maskedKey: formatMaskedKey(encrypted.keyPrefix, encrypted.lastFour),
  };
}
