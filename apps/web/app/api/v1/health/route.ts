// GET /api/v1/health
// Comprehensive operational health check for pilot testing and monitoring
// Reference: docs/TECHNICAL_BLUEPRINT.md & M3.5 Production Pilot Readiness

import { NextResponse } from 'next/server';
import { prisma } from '@/database/src/client';
import { isRedisAvailable } from '@/jobs/queues/tracking-queue';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'DOWN';
  let dbLatencyMs = -1;
  let dbError: string | null = null;

  // 1. Check Database Connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as ping`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'UP';
  } catch (err: any) {
    dbError = err?.message || 'Database ping failed';
  }

  // 2. Check Queue & Redis Connectivity
  let queueStatus = 'DEGRADED_SERVERLESS';
  let redisAvailable = false;
  try {
    redisAvailable = await isRedisAvailable();
    if (redisAvailable) {
      queueStatus = 'UP';
    }
  } catch {
    queueStatus = 'DEGRADED_SERVERLESS';
  }

  // 3. Provider Configuration Status (without secret leakage)
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const metaAdConfigured = Boolean(process.env.META_AD_LIBRARY_ACCESS_TOKEN);
  const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_SECRET);

  const isHealthy = dbStatus === 'UP';
  const totalLatencyMs = Date.now() - startTime;

  const payload = {
    status: isHealthy ? 'healthy' : 'degraded',
    version: '0.1.0',
    milestones: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'],
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    latencyMs: totalLatencyMs,
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
      queue: {
        status: queueStatus,
        redisAvailable,
        mode: redisAvailable ? 'BULLMQ_REDIS' : 'SERVERLESS_AFTER_FALLBACK',
      },
      aiProviders: {
        gemini: geminiConfigured ? 'READY' : 'MISSING_API_KEY',
        openai: openaiConfigured ? 'READY' : 'OPTIONAL_UNCONFIGURED',
      },
      adSources: {
        metaAdLibrary: metaAdConfigured ? 'CONFIGURED' : 'BLOCKED_TOKEN_MISSING',
        googleAdsTransparency: 'DEMO_ONLY_NO_PUBLIC_API',
        tiktokCreativeCenter: 'DEMO_ONLY_COMMERCIAL_ACCESS_REQUIRED',
        manualSubmission: 'WORKING',
      },
      billing: {
        provider: razorpayConfigured ? 'RAZORPAY' : 'MOCK_SANDBOX',
        taxEngine: 'ACTIVE_18_PERCENT_GST',
        plansConfigured: true,
      },
    },
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
