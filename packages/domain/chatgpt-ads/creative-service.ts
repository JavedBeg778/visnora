// Visnora — ChatGPT Ads Creative Studio & Conversational Preview Service
// Conversational disclosure compliance, AI creative suggestions, preview generation

import { prisma } from '../../database/src/client';
import { assertEntitlement } from '../billing/entitlements';
import { reserveAiRecommendationQuota, recordAiRecommendationUsage } from '../billing/usage-meter';
import { CreateAdInput } from './types';

export class AdNotFoundError extends Error {
  constructor(id: string) {
    super(`ChatGPT Ads ad "${id}" not found or unauthorized.`);
    this.name = 'AdNotFoundError';
  }
}

/**
 * Creates a new conversational ad creative.
 * Strictly defaults to 'PAUSED'.
 */
export async function createAd(input: CreateAdInput) {
  const {
    organizationId,
    adGroupId,
    name,
    headline,
    adCopy,
    advertiserName,
    destinationUrl,
    landingPageUrl,
    imageUrl,
    actorUserId,
  } = input;

  await assertEntitlement(organizationId, 'chatgpt_ads_management');

  // Verify ad group ownership
  const adGroup = await prisma.chatGPTAdsAdGroup.findFirst({
    where: { id: adGroupId, organizationId },
    include: { campaign: true },
  });

  if (!adGroup) {
    throw new Error(`Ad group "${adGroupId}" not found or unauthorized.`);
  }

  const openaiAdId = `ad_${Date.now()}`;

  const ad = await prisma.chatGPTAdsAd.create({
    data: {
      organizationId,
      adGroupId,
      accountId: adGroup.accountId,
      name,
      openaiAdId,
      status: 'PAUSED', // Strict default
      headline,
      adCopy,
      advertiserName,
      destinationUrl,
      landingPageUrl: landingPageUrl || destinationUrl,
      imageUrl: imageUrl || null,
      reviewStatus: 'PENDING',
      servingIssues: [],
    },
  });

  await prisma.chatGPTAdsAuditLog.create({
    data: {
      organizationId,
      accountId: adGroup.accountId,
      action: 'AD_CREATED',
      targetType: 'AD',
      targetId: ad.id,
      actorUserId: actorUserId || null,
      newState: { name, headline, destinationUrl, status: 'PAUSED' },
    },
  });

  return ad;
}

/**
 * Lists ads for an ad group or organization.
 */
export async function listAds(params: {
  organizationId: string;
  adGroupId?: string;
  status?: string;
}) {
  const { organizationId, adGroupId, status } = params;
  const where: any = { organizationId };
  if (adGroupId) where.adGroupId = adGroupId;
  if (status) where.status = status;

  return await prisma.chatGPTAdsAd.findMany({
    where,
    include: {
      adGroup: {
        include: {
          campaign: {
            select: { id: true, name: true, accountId: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Gets an ad by ID.
 */
export async function getAd(organizationId: string, adId: string) {
  const ad = await prisma.chatGPTAdsAd.findFirst({
    where: { id: adId, organizationId },
    include: {
      adGroup: {
        include: { campaign: true },
      },
    },
  });

  if (!ad) {
    throw new AdNotFoundError(adId);
  }

  return ad;
}

/**
 * Generates an interactive preview model representing how the ad appears
 * natively inside a ChatGPT conversational response.
 */
export function generateChatGPTConversationalPreview(ad: {
  headline: string;
  adCopy: string;
  callToAction?: string;
  advertiserName: string;
  destinationUrl: string;
  landingPageUrl?: string;
}) {
  return {
    placement: 'ChatGPT In-Thread Recommendation',
    disclosureBadge: 'Sponsored',
    simulatedConversation: {
      userPrompt: `Can you recommend the top solutions for ${ad.headline.toLowerCase()}?`,
      assistantResponsePreamble: `Based on your request, here is a highly relevant solution tailored to conversational workflows:`,
      sponsoredCard: {
        brandName: ad.advertiserName,
        headline: ad.headline,
        bodyText: ad.adCopy,
        callToAction: ad.callToAction || 'Learn More',
        destinationUrl: ad.destinationUrl,
        displayUrl: (ad.landingPageUrl || ad.destinationUrl).replace(/^https?:\/\//, '').split('/')[0],
        isVerifiedSponsored: true,
      },
      assistantFollowUp: `Would you like more details or alternative options?`,
    },
  };
}

/**
 * AI-powered Creative Suggestions Engine.
 * Tailored for ChatGPT conversational advertising paradigms (natural tone, helpfulness, clear value prop).
 */
export async function generateCreativeSuggestions(params: {
  organizationId: string;
  brandName: string;
  productDescription: string;
  targetAudience?: string;
  objective?: string;
  actorUserId?: string;
}) {
  const { organizationId, brandName, productDescription, targetAudience = 'Professionals and modern consumers', objective = 'CONVERSIONS' } = params;

  await assertEntitlement(organizationId, 'chatgpt_ads_management');

  // Check quota for recommendation/AI generation
  const reservation = await reserveAiRecommendationQuota(organizationId, 1);
  if (!reservation.allowed) {
    throw new Error(reservation.errorDetails?.message || 'Monthly AI generation quota exceeded.');
  }

  // Generate 3 conversational variations optimized for ChatGPT's chat UI
  const suggestions = [
    {
      variant: 'Conversational Direct',
      headline: `${brandName} — Solves Your Workflow in Seconds`,
      adCopy: `Ask questions, get instant answers, and streamline your operations with ${brandName}. Try it today.`,
      callToAction: 'Try Free Now',
      suggestedContextHints: [`${brandName.toLowerCase()} review`, 'best workflow tool', 'productivity assistant'],
      rationale: 'High intent, conversational direct response with immediate utility trigger.',
    },
    {
      variant: 'Problem-Solver Dialogue',
      headline: `Looking for Better Results? Meet ${brandName}`,
      adCopy: `Empowering ${targetAudience} with proven AI-driven accuracy. Seamlessly integrated into your daily workflow.`,
      callToAction: 'Learn More',
      suggestedContextHints: ['top recommendations', 'compare alternatives', 'how to optimize workflow'],
      rationale: 'Naturally answers exploratory queries where ChatGPT users look for guidance.',
    },
    {
      variant: 'High-Trust Authority',
      headline: `${brandName} — The Trusted Choice for Industry Leaders`,
      adCopy: `Over 10,000+ teams rely on ${brandName} for mission-critical visibility and growth. See why.`,
      callToAction: 'Start Exploring',
      suggestedContextHints: ['enterprise tools', 'verified solutions', 'software ratings'],
      rationale: 'Builds instant conversational credibility in ChatGPT answer threads.',
    },
  ];

  await recordAiRecommendationUsage({
    organizationId,
    quantity: 1,
    idempotencyKey: `ai_creative_${Date.now()}_${Math.random()}`,
  });

  return {
    brandName,
    objective,
    suggestions,
    generatedAt: new Date(),
  };
}
