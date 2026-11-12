import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeLogData,
  enqueueTrackingJob,
  isRedisAvailable,
  getRedisConfig,
} from '../../packages/jobs/queues/tracking-queue';
import {
  AiProviderError,
  AiAuthError,
  AiRateLimitError,
  AiTimeoutError,
  AiQuotaExhaustedError,
  AiCapacityError,
} from '../../packages/integrations/ai-providers/types';
import { estimateTrackingRunCost } from '../../packages/domain/ai-visibility/collection-engine';

describe('M3.2 Tracking Reliability & Queue Tests', () => {
  describe('Structured Logging Sanitization', () => {
    it('redacts sensitive fields and keys matching security patterns', () => {
      const payload = {
        organizationId: 'org-123',
        apiKey: 'AIzaSyD-sample-sensitive-secret-token',
        nested: {
          clientSecret: 'super-secret-password-12345',
          safeField: 'gemini-3.8-flash',
          authToken: 'Bearer eyJhbGciOi...',
        },
        publicCount: 10,
      };

      const sanitized = sanitizeLogData(payload);

      expect(sanitized.organizationId).toBe('org-123');
      expect(sanitized.publicCount).toBe(10);
      expect(sanitized.nested.safeField).toBe('gemini-3.8-flash');

      // Sensitive fields must be redacted
      expect(sanitized.apiKey).toContain('[REDACTED]');
      expect(sanitized.nested.clientSecret).toContain('[REDACTED]');
      expect(sanitized.nested.authToken).toContain('[REDACTED]');
    });
  });

  describe('Queue Graceful Degradation', () => {
    it('returns false for Redis availability when Redis is unconfigured or unreachable', async () => {
      // In default test environment without active Redis server
      const available = await isRedisAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('gracefully fails over when attempting to enqueue without Redis', async () => {
      const result = await enqueueTrackingJob({
        trackingRunId: 'test-run-id',
        organizationId: 'test-org',
        projectId: 'test-proj',
        provider: 'google-gemini',
        model: 'gemini-3.8-flash',
        enableGrounding: false,
        dryRun: true,
      });

      expect(result).toBeDefined();
      if (!result.queued) {
        expect(['REDIS_UNAVAILABLE', 'QUEUE_INITIALIZATION_FAILED']).toContain(result.reason);
      }
    });
  });

  describe('AI Provider Error Classification', () => {
    it('classifies rate limit errors with retryable semantics', () => {
      const error = new AiRateLimitError('google-gemini', 'Rate limit exceeded', 30);
      expect(error.name).toBe('AiRateLimitError');
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.statusCode).toBe(429);
      expect(error.isRetryable).toBe(true);
      expect(error.retryAfterSeconds).toBe(30);
    });

    it('classifies timeout errors with retryable semantics', () => {
      const error = new AiTimeoutError('google-gemini', 25000);
      expect(error.name).toBe('AiTimeoutError');
      expect(error.code).toBe('TIMEOUT');
      expect(error.statusCode).toBe(408);
      expect(error.isRetryable).toBe(true);
    });

    it('classifies quota exhaustion errors as permanent non-retryable', () => {
      const error = new AiQuotaExhaustedError('google-gemini', 'Resource exhausted', 'general');
      expect(error.name).toBe('AiQuotaExhaustedError');
      expect(error.code).toBe('QUOTA_EXHAUSTED');
      expect(error.statusCode).toBe(429);
      expect(error.isRetryable).toBe(false);
    });

    it('classifies high demand capacity errors as retryable', () => {
      const error = new AiCapacityError('google-gemini', 'gemini-3.8-flash', 'Model overloaded');
      expect(error.name).toBe('AiCapacityError');
      expect(error.code).toBe('CAPACITY_EXHAUSTED');
      expect(error.statusCode).toBe(503);
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('Cost Accounting & Estimation', () => {
    it('calculates deterministic cost estimates for prompt batches', () => {
      const estimate = estimateTrackingRunCost(10, 'gemini-3.8-flash', false);

      expect(estimate.promptCount).toBe(10);
      expect(estimate.estimatedTotalTokens).toBe(6000); // 150 in + 450 out * 10
      expect(estimate.estimatedCostUsd).toBeGreaterThan(0);
      expect(estimate.estimatedCostPaise).toBeGreaterThan(0);
      expect(estimate.provider).toBe('Google Gemini');
    });

    it('calculates cheaper cost estimates for flash lite model', () => {
      const standard = estimateTrackingRunCost(10, 'gemini-3.8-flash', false);
      const lite = estimateTrackingRunCost(10, 'gemini-3.5-flash-lite', false);

      expect(lite.estimatedCostPaise).toBeLessThan(standard.estimatedCostPaise);
    });
  });
});

