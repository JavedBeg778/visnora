// Visnora — ChatGPT Ads Ad Group Management Service
// Context hints, targeting, and bidding management

import { prisma } from '../../database/src/client';
import { assertEntitlement } from '../billing/entitlements';
import { CreateAdGroupInput } from './types';

export class AdGroupNotFoundError extends Error {
  constructor(id: string) {
    super(`ChatGPT Ads ad group "${id}" not found or unauthorized.`);
    this.name = 'AdGroupNotFoundError';
  }
}

/**
 * Creates an ad group under an existing campaign.
 * Defaults to 'PAUSED' status.
 */
export async function createAdGroup(input: CreateAdGroupInput) {
  const { organizationId, campaignId, name, bidAmountPaise, contextHints, audienceConfig, bidStrategy, actorUserId } = input;

  await assertEntitlement(organizationId, 'chatgpt_ads_management');

  // Verify campaign belongs to org
  const campaign = await prisma.chatGPTAdsCampaign.findFirst({
    where: { id: campaignId, organizationId },
  });
  if (!campaign) {
    throw new Error(`Campaign "${campaignId}" not found or unauthorized.`);
  }

  const openaiAdGroupId = `adgrp_${Date.now()}`;

  const adGroup = await prisma.chatGPTAdsAdGroup.create({
    data: {
      organizationId,
      campaignId,
      accountId: campaign.accountId,
      name,
      openaiAdGroupId,
      status: 'PAUSED', // Default to paused
      bidAmountPaise: bidAmountPaise ? BigInt(bidAmountPaise) : null,
      contextHints: contextHints || [],
      audienceConfig: audienceConfig || {},
      bidStrategy: bidStrategy || 'MAXIMIZE_CLICKS',
    },
  });

  await prisma.chatGPTAdsAuditLog.create({
    data: {
      organizationId,
      accountId: campaign.accountId,
      action: 'AD_GROUP_CREATED',
      targetType: 'AD_GROUP',
      targetId: adGroup.id,
      actorUserId: actorUserId || null,
      newState: { name, status: 'PAUSED', contextHints },
    },
  });

  return adGroup;
}

/**
 * Lists ad groups for a campaign or organization.
 */
export async function listAdGroups(params: {
  organizationId: string;
  campaignId?: string;
  status?: string;
}) {
  const { organizationId, campaignId, status } = params;
  const where: any = { organizationId };
  if (campaignId) where.campaignId = campaignId;
  if (status) where.status = status;

  return await prisma.chatGPTAdsAdGroup.findMany({
    where,
    include: {
      campaign: {
        select: { id: true, name: true, status: true },
      },
      ads: true,
      _count: {
        select: { ads: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Gets ad group by ID.
 */
export async function getAdGroup(organizationId: string, adGroupId: string) {
  const adGroup = await prisma.chatGPTAdsAdGroup.findFirst({
    where: { id: adGroupId, organizationId },
    include: {
      campaign: true,
      ads: true,
    },
  });

  if (!adGroup) {
    throw new AdGroupNotFoundError(adGroupId);
  }

  return adGroup;
}

/**
 * Updates ad group attributes.
 */
export async function updateAdGroup(
  organizationId: string,
  adGroupId: string,
  updates: {
    name?: string;
    bidAmountPaise?: number | bigint;
    contextHints?: string[];
    audienceConfig?: Record<string, any>;
    status?: string;
  },
  actorUserId?: string
) {
  await assertEntitlement(organizationId, 'chatgpt_ads_management');

  const existing = await getAdGroup(organizationId, adGroupId);

  const data: any = {};
  if (updates.name) data.name = updates.name;
  if (updates.bidAmountPaise !== undefined) {
    data.bidAmountPaise = updates.bidAmountPaise ? BigInt(updates.bidAmountPaise) : null;
  }
  if (updates.contextHints) data.contextHints = updates.contextHints;
  if (updates.audienceConfig) data.audienceConfig = updates.audienceConfig;
  if (updates.status) data.status = updates.status;

  const updated = await prisma.chatGPTAdsAdGroup.update({
    where: { id: adGroupId },
    data,
  });

  await prisma.chatGPTAdsAuditLog.create({
    data: {
      organizationId,
      accountId: existing.accountId,
      action: 'AD_GROUP_UPDATED',
      targetType: 'AD_GROUP',
      targetId: adGroupId,
      actorUserId: actorUserId || null,
      previousState: {
        name: existing.name,
        status: existing.status,
      },
      newState: data,
    },
  });

  return updated;
}
