// Visnora — ChatGPT Ads Conversion Tracking & Conversions API (CAPI) Service
// Deduplication, SHA-256 normalization, pixel snippet generation, and transmission

import crypto from 'crypto';
import { prisma } from '../../database/src/client';
import { assertEntitlement } from '../billing/entitlements';
import { getClientForAccount } from './account-service';
import { ConversionsApiEventInput } from './types';

export function hashIdentifier(val: string): string {
  const normalized = val.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function computeDeduplicationId(params: {
  eventName: string;
  userHash?: string;
  orderId?: string;
  eventTime: Date;
}): string {
  const { eventName, userHash = '', orderId = '', eventTime } = params;
  const timeSlice = Math.floor(eventTime.getTime() / 60000); // 1-minute bucket if no orderId
  const raw = `${eventName}_${userHash}_${orderId || timeSlice}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Generates the Visnora ChatGPT Ads Measurement Pixel JavaScript snippet.
 */
export function generatePixelSnippet(params: {
  organizationId: string;
  accountId?: string;
  appBaseUrl?: string;
}) {
  const { organizationId, accountId = '', appBaseUrl = 'https://visnora.vercel.app' } = params;

  return `<!-- Visnora ChatGPT Ads Measurement Pixel -->
<script>
!function(w,d,t,u,o,a,m){w['VisnoraAdsObject']=o;w[o]=w[o]||function(){
(w[o].q=w[o].q||[]).push(arguments)},w[o].l=1*new Date();a=d.createElement(t),
m=d.getElementsByTagName(t)[0];a.async=1;a.src=u;m.parentNode.insertBefore(a,m)
}(window,document,'script','${appBaseUrl}/sdk/visnora-ads-pixel.js','visnoraAds');

visnoraAds('init', '${organizationId}', { accountId: '${accountId}' });
visnoraAds('track', 'PageView');
</script>
<!-- End Visnora ChatGPT Ads Measurement Pixel -->`;
}

/**
 * Ingests a conversion event from Pixel or Conversions API (CAPI), performs deduplication,
 * and delivers to OpenAI Ads CAPI endpoint.
 */
export async function ingestConversionEvent(input: ConversionsApiEventInput) {
  const {
    organizationId,
    accountId,
    eventName,
    eventTimestamp = new Date(),
    userEmail,
    userPhone,
    userExternalId,
    eventSource = 'SERVER',
    currency = 'USD',
    valuePaise,
    metadata = {},
    deduplicationId,
  } = input;

  await assertEntitlement(organizationId, 'chatgpt_ads_intelligence');

  const resolvedTime = new Date(eventTimestamp);

  // 1. Compute Hashed User Identifier
  let userIdentifierHash: string | null = null;
  if (userEmail) {
    userIdentifierHash = hashIdentifier(userEmail);
  } else if (userPhone) {
    userIdentifierHash = hashIdentifier(userPhone);
  } else if (userExternalId) {
    userIdentifierHash = hashIdentifier(userExternalId);
  }

  // 2. Resolve or compute Deduplication ID
  const dedupKey =
    deduplicationId ||
    computeDeduplicationId({
      eventName,
      userHash: userIdentifierHash || undefined,
      orderId: metadata?.orderId || metadata?.transactionId,
      eventTime: resolvedTime,
    });

  // 3. Deduplication Check (look back 48 hours)
  const existingEvent = await prisma.chatGPTAdsEvent.findUnique({
    where: { deduplicationId: dedupKey },
  });

  if (existingEvent) {
    return {
      status: 'DEDUPLICATED',
      eventId: existingEvent.id,
      deduplicationId: dedupKey,
      message: 'Conversion event deduplicated against recent transaction.',
    };
  }

  // 4. Resolve Target Ads Account & Conversion Config
  let targetAccountId = accountId;
  if (!targetAccountId) {
    const firstAccount = await prisma.chatGPTAdsAccount.findFirst({
      where: { organizationId, status: 'CONNECTED' },
    });
    targetAccountId = firstAccount?.id;
  }

  if (!targetAccountId) {
    throw new Error('No connected ChatGPT Ads account found for conversion delivery.');
  }

  let config = await prisma.chatGPTAdsConversion.findFirst({
    where: { organizationId, accountId: targetAccountId },
  });

  if (!config) {
    config = await prisma.chatGPTAdsConversion.create({
      data: {
        organizationId,
        accountId: targetAccountId,
        pixelId: `pix_${targetAccountId.slice(0, 8)}`,
        pixelCode: generatePixelSnippet({ organizationId, accountId: targetAccountId }),
        pixelStatus: 'ACTIVE',
        conversionsApiEnabled: true,
      },
    });
  }

  // 5. Persist event record in DB
  const eventId = `evt_${Date.now()}`;
  const conversionEvent = await prisma.chatGPTAdsEvent.create({
    data: {
      organizationId,
      conversionConfigId: config.id,
      eventName,
      eventId,
      deduplicationId: dedupKey,
      eventTimestamp: resolvedTime,
      eventSource,
      currency,
      valuePaise: valuePaise ? BigInt(valuePaise) : null,
      status: 'PENDING',
      metadata: {
        ...metadata,
        userIdentifierHash,
      },
    },
  });

  // 6. Forward to OpenAI Ads Conversions API
  let dispatchStatus: 'SENT' | 'FAILED' = 'SENT';
  let apiResponseCode = 200;

  try {
    const client = await getClientForAccount(organizationId, targetAccountId);
    const capiResult = await client.sendConversionEvents([
      {
        event_name: eventName,
        event_id: eventId,
        deduplication_id: dedupKey,
        event_time: resolvedTime.toISOString(),
        event_source: eventSource === 'PIXEL' ? 'PIXEL' : 'SERVER',
        user_data: {
          external_id: userExternalId || undefined,
        },
        custom_data: {
          currency,
          value: valuePaise ? Number(valuePaise) / 100 : undefined,
          order_id: metadata?.orderId,
        },
      },
    ]);
    dispatchStatus = capiResult.events_received > 0 ? 'SENT' : 'FAILED';
    apiResponseCode = 200;
  } catch (err: any) {
    dispatchStatus = 'FAILED';
    apiResponseCode = err.statusCode || 500;
  }

  // Update event record with delivery outcome
  await prisma.chatGPTAdsEvent.update({
    where: { id: conversionEvent.id },
    data: {
      status: dispatchStatus,
      apiResponseCode,
    },
  });

  return {
    status: dispatchStatus,
    eventId: conversionEvent.id,
    deduplicationId: dedupKey,
    apiResponseCode,
  };
}

/**
 * Lists conversion events for diagnostics.
 */
export async function listConversions(params: {
  organizationId: string;
  limit?: number;
}) {
  const { organizationId, limit = 50 } = params;

  const events = await prisma.chatGPTAdsEvent.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return events.map((c) => ({
    id: c.id,
    eventName: c.eventName,
    eventTimestamp: c.eventTimestamp,
    eventSource: c.eventSource,
    currency: c.currency,
    value: c.valuePaise ? Number(c.valuePaise) / 100 : null,
    status: c.status,
    deduplicationId: c.deduplicationId,
    apiResponseCode: c.apiResponseCode,
    createdAt: c.createdAt,
  }));
}
