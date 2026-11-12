import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MockBillingProvider,
  getPaymentProvider,
} from '../../packages/domain/billing/payment-provider';

describe('M4.2 Mock Payment Provider & Gateway Abstraction', () => {
  let originalEnv: string | undefined;
  let originalEnableMock: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    originalEnableMock = process.env.ENABLE_MOCK_BILLING;
  });

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
    process.env.ENABLE_MOCK_BILLING = originalEnableMock;
  });

  it('instantiates MockBillingProvider with provider name "mock"', () => {
    const provider = new MockBillingProvider();
    expect(provider.name).toBe('mock');
  });

  it('creates checkout session with valid session ID, amount in paise, and order reference', async () => {
    const provider = new MockBillingProvider();
    const session = await provider.createCheckoutSession({
      organizationId: 'test-org-123',
      planSlug: 'starter',
      billingCycle: 'MONTHLY',
    });

    expect(session.sessionId).toMatch(/^mock_sess_/);
    expect(session.orderId).toMatch(/^mock_ord_/);
    expect(session.provider).toBe('mock');
    expect(session.planSlug).toBe('starter');
    expect(session.billingCycle).toBe('MONTHLY');
    expect(session.amountPaise).toBe(149900); // ₹1,499
    expect(session.currency).toBe('INR');
    expect(session.isDevelopmentSimulation).toBe(true);
    expect(session.status).toBe('PENDING');
  });

  it('creates annual checkout session with 10-month discounted amount', async () => {
    const provider = new MockBillingProvider();
    const session = await provider.createCheckoutSession({
      organizationId: 'test-org-123',
      planSlug: 'starter',
      billingCycle: 'ANNUAL',
    });

    expect(session.amountPaise).toBe(1499000); // ₹14,990 (10x monthly)
    expect(session.billingCycle).toBe('ANNUAL');
  });

  it('rejects verification for non-existent session ID', async () => {
    const provider = new MockBillingProvider();

    await expect(
      provider.verifyPayment({
        organizationId: 'test-org-123',
        sessionId: 'mock_sess_nonexistent_999999',
      })
    ).rejects.toThrow('Invalid or expired checkout session');
  });

  it('strictly prohibits mock session creation in production without explicit override', async () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.ENABLE_MOCK_BILLING;

    const provider = new MockBillingProvider();

    await expect(
      provider.createCheckoutSession({
        organizationId: 'test-org-123',
        planSlug: 'pro',
        billingCycle: 'MONTHLY',
      })
    ).rejects.toThrow('Mock billing checkout is disabled in production environments');
  });

  it('strictly prohibits mock payment verification in production without explicit override', async () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.ENABLE_MOCK_BILLING;

    const provider = new MockBillingProvider();

    await expect(
      provider.verifyPayment({
        organizationId: 'test-org-123',
        sessionId: 'mock_sess_any',
      })
    ).rejects.toThrow('Mock billing verification is disabled in production environments');
  });

  it('defaults to MockBillingProvider via getPaymentProvider() in development', () => {
    const provider = getPaymentProvider();
    expect(provider.name).toBe('mock');
  });
});
