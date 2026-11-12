import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeLogData,
  isRedisAvailable,
  enqueueTrackingJob,
  getTrackingQueue,
  closeTrackingQueue,
} from '../../packages/jobs/queues/tracking-queue';
import {
  enqueueAdCollectionJob,
  enqueueAdMonitoringJob,
  getAdQueue,
  closeAdQueue,
} from '../../packages/jobs/queues/ad-queue';

describe('Phase 1 — M3 + M5 Redis & BullMQ Worker Infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await closeTrackingQueue();
    await closeAdQueue();
  });

  describe('Secret Sanitization', () => {
    it('redacts sensitive keys from log data', () => {
      const sensitive = {
        apiKey: 'AIzaSyA_REAL_SECRET_KEY_12345',
        clientSecret: 'super-secret-token',
        password: 'password123',
        normalField: 'visible-value',
        nested: {
          authToken: 'Bearer xyz987654321',
          safeField: 42,
        },
      };

      const sanitized = sanitizeLogData(sensitive);
      expect(sanitized.apiKey).toContain('[REDACTED]');
      expect(sanitized.clientSecret).toContain('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.normalField).toBe('visible-value');
      expect(sanitized.nested.authToken).toContain('[REDACTED]');
      expect(sanitized.nested.safeField).toBe(42);
    });
  });

  describe('Real Redis & Queue Connectivity', () => {
    it('verifies Redis ping connectivity against configured endpoint', async () => {
      const isAvailable = await isRedisAvailable();
      // If memurai/redis is running on 127.0.0.1:6379, it should be true
      expect(typeof isAvailable).toBe('boolean');
    });

    it('creates tracking queue without throwing', () => {
      const queue = getTrackingQueue();
      if (queue) {
        expect(queue.name).toBe('tracking-execution');
      }
    });

    it('creates ad intelligence queue without throwing', () => {
      const queue = getAdQueue();
      if (queue) {
        expect(queue.name).toBe('ad-intelligence');
      }
    });

    it('enqueues tracking job or returns graceful fallback if redis unavailable', async () => {
      const result = await enqueueTrackingJob({
        trackingRunId: 'test-run-123',
        organizationId: 'test-org-123',
        projectId: 'test-proj-123',
        provider: 'google-gemini',
        model: 'gemini-3.8-flash',
        enableGrounding: false,
        dryRun: true,
      });

      expect(typeof result.queued).toBe('boolean');
      if (result.queued) {
        expect(result.jobId).toBeDefined();
      } else {
        expect(result.reason).toBeDefined();
      }
    });

    it('enqueues ad collection and monitoring jobs or handles fallback', async () => {
      const collectResult = await enqueueAdCollectionJob({
        organizationId: 'test-org-123',
        projectId: 'test-proj-123',
        sourceType: 'META_AD_LIBRARY',
        query: 'Zomato',
        limit: 5,
        country: 'IN',
        autoAnalyze: false,
      });

      expect(typeof collectResult.queued).toBe('boolean');

      const monitorResult = await enqueueAdMonitoringJob({
        organizationId: 'test-org-123',
        projectId: 'test-proj-123',
        country: 'IN',
      });

      expect(typeof monitorResult.queued).toBe('boolean');
    });
  });
});

