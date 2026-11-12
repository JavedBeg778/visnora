// Visnora — M6 Creative Preview Simulation Unit Tests

import { describe, it, expect } from 'vitest';
import { generateChatGPTConversationalPreview } from '../../packages/domain/chatgpt-ads/creative-service';

describe('M6 Creative Studio & In-Thread Simulation', () => {
  it('generates an authentic in-thread ChatGPT conversational preview model', () => {
    const preview = generateChatGPTConversationalPreview({
      headline: 'Visnora AI Search Intelligence',
      adCopy: 'Track what ChatGPT and Gemini say about your brand.',
      advertiserName: 'Visnora',
      callToAction: 'Try Free Trial',
      destinationUrl: 'https://visnora.vercel.app/signup',
      landingPageUrl: 'https://visnora.vercel.app',
    });

    expect(preview.placement).toBe('ChatGPT In-Thread Recommendation');
    expect(preview.disclosureBadge).toBe('Sponsored');
    expect(preview.simulatedConversation).toBeDefined();

    const { sponsoredCard, assistantResponsePreamble, assistantFollowUp } = preview.simulatedConversation;
    expect(assistantResponsePreamble).toContain('Based on your request');
    expect(assistantFollowUp).toContain('Would you like more details');

    expect(sponsoredCard.brandName).toBe('Visnora');
    expect(sponsoredCard.headline).toBe('Visnora AI Search Intelligence');
    expect(sponsoredCard.callToAction).toBe('Try Free Trial');
    expect(sponsoredCard.isVerifiedSponsored).toBe(true);
    expect(sponsoredCard.displayUrl).toBe('visnora.vercel.app');
  });
});

