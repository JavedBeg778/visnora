// Visnora — ChatGPT Ads Campaign Management Service
// Enforces default 'PAUSED' state, financial confirmation, and tenant isolation

import crypto from 'crypto';
import { prisma } from '../../database/src/client';
import { assertEntitlement } from '../billing/entitlements';
import { getClientForAccount } from './account-service';
import { CreateCampaignInput, UpdateCampaignInput } from './types';

export class CampaignValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CampaignValidationError';
  }
}

export class FinancialConfirmationRequiredError extends Error {
  constructor(action: string) {
    super(`Consequential financial action "${action}" requires explicit financial confirmation.`);
    this.name = 'FinancialConfirmationRequiredError';
  }
}

export class CampaignNotFoundError extends Error {
  constructor(id: string) {
    super(`ChatGPT Ads campaign "${id}" not found or unauthorized.`);
    this.name = 'CampaignNotFoundError';
  }
}

/**
 * Creates a new ChatGPT Ads campaign.
 * STRICT SAFETY RULE: Status is ALWAYS initialized to 'PAUSED'.
 */
export async function createCampaign(input: CreateCampaignInput) {
  const {
    organizationId,
    accountId,
    name,
    objective,
    budgetAmountPaise,
    budgetType = 'DAILY',
    currency = 'USD',
    startTime,
    endTime,
    contextTargeting,
    negativeContexts,
    actorUserId,
    financialConfirmation,
  } = input;

  // 1. Entitlement Guard
  await assertEntitlement(organizationId, 'chatgpt_ads_management');

  // 2. Budget Validation
  const budgetVal = BigInt(budgetAmountPaise);
  if (budgetVal <= BigInt(0)) {
    throw new CampaignValidationError('Campaign budget must be greater than zero.');
  }

  // Financial confirmation check
  if (!financialConfirmation) {
    throw new FinancialConfirmationRequiredError('create_campaign');
  }

  // 3. Verify Account Ownership
  const account = await prisma.chatGPTAdsAccount.findFirst({
    where: { id: accountId, organizationId },
  });
  if (!account) {
    throw new Error(`Account "${accountId}" not found or unauthorized.`);
  }

  // 4. Synchronize with OpenAI Ads API — require verified provider campaign creation
  let client;
  try {
    client = await getClientForAccount(organizationId, accountId);
  } catch (err: any) {
    throw new Error(`NOT_CONFIGURED: OpenAI Ads API client could not be initialized: ${err.message}`);
  }

  let remoteCampaign;
  try {
    remoteCampaign = await client.createCampaign({
      name,
      objective: objective as any,
      budget: {
        amount: Number(budgetVal) / 100,
        type: (budgetType as any) || 'DAILY',
        currency,
      },
      status: 'PAUSED',
    });
  } catch (err: any) {
    throw new Error(`BLOCKED_EXTERNAL_DEPENDENCY: OpenAI Ads remote campaign creation failed: ${err.message}`);
  }

  if (!remoteCampaign?.id) {
    throw new Error('BLOCKED_EXTERNAL_DEPENDENCY: OpenAI Ads API did not return a valid campaign ID.');
  }

  const openaiCampaignId = remoteCampaign.id;
  const deliveryStatus = 'SYNCED';

  // 5. Persist campaign with verified provider campaign ID and STRICT status: 'PAUSED'
  const campaign = await prisma.chatGPTAdsCampaign.create({
    data: {
      organizationId,
      accountId,
      name,
      openaiCampaignId,
      status: 'PAUSED', // Non-negotiable default
      deliveryStatus,
      objective,
      budgetAmountPaise: budgetVal,
      budgetType,
      currency,
      startTime: startTime || new Date(),
      endTime: endTime || null,
      targetingConfig: {
        contextTargeting: contextTargeting || [],
        negativeContexts: negativeContexts || [],
      },
    },
  });

  // 6. Record Audit Log
  await prisma.chatGPTAdsAuditLog.create({
    data: {
      organizationId,
      accountId,
      action: 'CAMPAIGN_CREATED',
      targetType: 'CAMPAIGN',
      targetId: campaign.id,
      actorUserId: actorUserId || null,
      newState: {
        name,
        objective,
        budgetAmountPaise: budgetVal.toString(),
        status: 'PAUSED',
      },
    },
  });

  return campaign;
}

/**
 * Lists campaigns for an organization, optionally filtered by account or status.
 */
export async function listCampaigns(params: {
  organizationId: string;
  accountId?: string;
  status?: string;
  search?: string;
}) {
  const { organizationId, accountId, status, search } = params;

  const where: any = { organizationId };
  if (accountId) where.accountId = accountId;
  if (status) where.status = status;
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  return await prisma.chatGPTAdsCampaign.findMany({
    where,
    include: {
      account: {
        select: { id: true, name: true, currency: true },
      },
      adGroups: {
        select: { id: true, name: true, status: true },
      },
      _count: {
        select: { adGroups: true, insights: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Gets campaign by ID ensuring tenant isolation.
 */
export async function getCampaign(organizationId: string, campaignId: string) {
  const campaign = await prisma.chatGPTAdsCampaign.findFirst({
    where: { id: campaignId, organizationId },
    include: {
      account: true,
      adGroups: {
        include: {
          ads: true,
        },
      },
      insights: {
        take: 30,
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!campaign) {
    throw new CampaignNotFoundError(campaignId);
  }

  return campaign;
}

/**
 * Updates campaign configuration (budget, targeting, dates).
 */
export async function updateCampaign(
  organizationId: string,
  campaignId: string,
  input: UpdateCampaignInput
) {
  await assertEntitlement(organizationId, 'chatgpt_ads_management');

  const existing = await getCampaign(organizationId, campaignId);

  // If modifying budget, verify financial confirmation
  if (input.budgetAmountPaise !== undefined) {
    const newBudget = BigInt(input.budgetAmountPaise);
    if (newBudget <= BigInt(0)) {
      throw new CampaignValidationError('Campaign budget must be greater than zero.');
    }
    if (newBudget !== existing.budgetAmountPaise && !input.financialConfirmation) {
      throw new FinancialConfirmationRequiredError('update_campaign_budget');
    }
  }

  const updateData: any = {};
  if (input.name) updateData.name = input.name;
  if (input.budgetAmountPaise !== undefined) updateData.budgetAmountPaise = BigInt(input.budgetAmountPaise);
  if (input.budgetType) updateData.budgetType = input.budgetType;
  if (input.startTime) updateData.startTime = input.startTime;
  if (input.endTime !== undefined) updateData.endTime = input.endTime;

  if (input.contextTargeting || input.negativeContexts) {
    const prevTargeting = (existing.targetingConfig as any) || {};
    updateData.targetingConfig = {
      ...prevTargeting,
      ...(input.contextTargeting ? { contextTargeting: input.contextTargeting } : {}),
      ...(input.negativeContexts ? { negativeContexts: input.negativeContexts } : {}),
    };
  }

  // Sync to OpenAI Ads API if possible
  try {
    const client = await getClientForAccount(organizationId, existing.accountId);
    await client.updateCampaign(existing.openaiCampaignId, {
      name: updateData.name,
      budget: updateData.budgetAmountPaise ? {
        amount: Number(updateData.budgetAmountPaise) / 100,
        type: (updateData.budgetType as any) || existing.budgetType || 'DAILY',
        currency: existing.currency,
      } : undefined,
    });
  } catch (err: any) {
    console.warn('[CampaignService] Remote update note:', err.message);
  }

  const updated = await prisma.chatGPTAdsCampaign.update({
    where: { id: campaignId },
    data: updateData,
  });

  await prisma.chatGPTAdsAuditLog.create({
    data: {
      organizationId,
      accountId: existing.accountId,
      action: 'CAMPAIGN_UPDATED',
      targetType: 'CAMPAIGN',
      targetId: campaignId,
      actorUserId: input.actorUserId || null,
      previousState: {
        name: existing.name,
        budgetAmountPaise: existing.budgetAmountPaise.toString(),
      },
      newState: {
        ...updateData,
        budgetAmountPaise: updateData.budgetAmountPaise?.toString(),
      },
    },
  });

  return updated;
}

/**
 * Pauses a campaign.
 */
export async function pauseCampaign(organizationId: string, campaignId: string, actorUserId?: string) {
  await assertEntitlement(organizationId, 'chatgpt_ads_management');
  const existing = await getCampaign(organizationId, campaignId);

  try {
    const client = await getClientForAccount(organizationId, existing.accountId);
    await client.updateCampaign(existing.openaiCampaignId, { status: 'PAUSED' });
  } catch (err: any) {
    console.warn('[CampaignService] Remote pause note:', err.message);
  }

  const updated = await prisma.chatGPTAdsCampaign.update({
    where: { id: campaignId },
    data: { status: 'PAUSED' },
  });

  await prisma.chatGPTAdsAuditLog.create({
    data: {
      organizationId,
      accountId: existing.accountId,
      action: 'CAMPAIGN_PAUSED',
      targetType: 'CAMPAIGN',
      targetId: campaignId,
      actorUserId: actorUserId || null,
      newState: { status: 'PAUSED' },
    },
  });

  return updated;
}

/**
 * Resumes / activates a campaign. Requires explicit financial confirmation.
 */
export async function resumeCampaign(
  organizationId: string,
  campaignId: string,
  confirmation: boolean,
  actorUserId?: string
) {
  await assertEntitlement(organizationId, 'chatgpt_ads_management');

  if (!confirmation) {
    throw new FinancialConfirmationRequiredError('activate_campaign');
  }

  const existing = await getCampaign(organizationId, campaignId);

  try {
    const client = await getClientForAccount(organizationId, existing.accountId);
    await client.updateCampaign(existing.openaiCampaignId, { status: 'ACTIVE' });
  } catch (err: any) {
    console.warn('[CampaignService] Remote resume note:', err.message);
  }

  const updated = await prisma.chatGPTAdsCampaign.update({
    where: { id: campaignId },
    data: { status: 'ACTIVE' },
  });

  await prisma.chatGPTAdsAuditLog.create({
    data: {
      organizationId,
      accountId: existing.accountId,
      action: 'CAMPAIGN_ACTIVATED',
      targetType: 'CAMPAIGN',
      targetId: campaignId,
      actorUserId: actorUserId || null,
      newState: { status: 'ACTIVE' },
    },
  });

  return updated;
}
