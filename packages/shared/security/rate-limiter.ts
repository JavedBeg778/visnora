// Visnora — Distributed & In-Memory Rate Limiter
// Reference: docs/SECURITY.md & Phase 1 Audit Finding 11

export type RateLimitTier = 'AUTH' | 'TRACKING' | 'API_GENERAL' | 'INVITATION';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMIT_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  AUTH: { maxRequests: 5, windowSeconds: 900 },         // 5 req / 15 min
  INVITATION: { maxRequests: 10, windowSeconds: 900 },   // 10 req / 15 min
  TRACKING: { maxRequests: 10, windowSeconds: 60 },      // 10 req / 1 min
  API_GENERAL: { maxRequests: 100, windowSeconds: 900 }, // 100 req / 15 min
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  limit: number;
}

// In-Memory sliding-window store
interface MemoryRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, MemoryRecord>();

// Cleanup stale in-memory records periodically
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      // Keep entries that have timestamps in the last 15 minutes
      const valid = record.timestamps.filter((ts) => now - ts < 900_000);
      if (valid.length === 0) {
        memoryStore.delete(key);
      } else {
        record.timestamps = valid;
      }
    }
  }, 60_000);

  // Do not hold process open in Node.js / CLI environments
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Check rate limit for a given key and tier.
 * Uses Redis if available and connected; falls back safely to in-memory sliding window.
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = 'API_GENERAL',
  customConfig?: RateLimitConfig
): Promise<RateLimitResult> {
  const config = customConfig || RATE_LIMIT_CONFIGS[tier];
  const windowMs = config.windowSeconds * 1000;
  const now = Date.now();
  const bucketKey = `rl:${tier}:${identifier}`;

  // Check if Redis is configured
  if (process.env.REDIS_URL && !process.env.REDIS_URL.includes('mock')) {
    try {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(process.env.REDIS_URL, {
        connectTimeout: 1000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      await redis.connect();

      const clearBefore = now - windowMs;
      const tx = redis.multi();
      tx.zremrangebyscore(bucketKey, 0, clearBefore);
      tx.zcard(bucketKey);
      tx.zadd(bucketKey, now, `${now}-${Math.random()}`);
      tx.expire(bucketKey, config.windowSeconds);

      const results = await tx.exec();
      await redis.quit();

      if (results && results[1]) {
        const count = results[1][1] as number;
        if (count >= config.maxRequests) {
          return {
            allowed: false,
            remaining: 0,
            resetSeconds: config.windowSeconds,
            limit: config.maxRequests,
          };
        }
        return {
          allowed: true,
          remaining: Math.max(0, config.maxRequests - count - 1),
          resetSeconds: config.windowSeconds,
          limit: config.maxRequests,
        };
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          `[RateLimiter] ALERT: Redis rate limiter unavailable in production (${err?.message || err}). Falling back to instance-local in-memory limiting.`
        );
      }
    }
  }

  // In-Memory sliding-window rate limit
  const record = memoryStore.get(bucketKey) || { timestamps: [] };
  const cutoff = now - windowMs;
  const recentTimestamps = record.timestamps.filter((ts) => ts > cutoff);

  if (recentTimestamps.length >= config.maxRequests) {
    const oldest = recentTimestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
      limit: config.maxRequests,
    };
  }

  recentTimestamps.push(now);
  memoryStore.set(bucketKey, { timestamps: recentTimestamps });

  return {
    allowed: true,
    remaining: config.maxRequests - recentTimestamps.length,
    resetSeconds: config.windowSeconds,
    limit: config.maxRequests,
  };
}

/**
 * Clear rate limit store (useful for unit testing).
 */
export function resetRateLimitStore(): void {
  memoryStore.clear();
}

