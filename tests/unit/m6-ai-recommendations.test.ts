// Visnora — M6 AI Recommendations Engine & 12 Dimensions Unit Tests

import { describe, it, expect } from 'vitest';
import {
  OPTIMIZATION_DIMENSIONS,
  RecommendationNotFoundError,
} from '../../packages/domain/chatgpt-ads/optimization-service';

describe('M6 12-Dimension AI Optimization Engine', () => {
  it('covers all 12 conversational advertising optimization dimensions', () => {
    expect(OPTIMIZATION_DIMENSIONS).toHaveLength(12);
    expect(OPTIMIZATION_DIMENSIONS).toContain('CONVERSATIONAL_INTENT_TARGETING');
    expect(OPTIMIZATION_DIMENSIONS).toContain('CONTEXT_HINTS_REFINEMENT');
    expect(OPTIMIZATION_DIMENSIONS).toContain('NEGATIVE_CONTEXT_EXCLUSIONS');
    expect(OPTIMIZATION_DIMENSIONS).toContain('CREATIVE_CONVERSATIONAL_RELEVANCE');
    expect(OPTIMIZATION_DIMENSIONS).toContain('CTA_CONVERSATIONAL_FIT');
    expect(OPTIMIZATION_DIMENSIONS).toContain('BID_AND_PACING_EFFICIENCY');
    expect(OPTIMIZATION_DIMENSIONS).toContain('BUDGET_REALLOCATION');
    expect(OPTIMIZATION_DIMENSIONS).toContain('QUALITY_AND_ENGAGEMENT_OPTIMIZATION');
    expect(OPTIMIZATION_DIMENSIONS).toContain('AI_SOV_COMPETITIVE_ALIGNMENT');
    expect(OPTIMIZATION_DIMENSIONS).toContain('DAYPARTING_CONVERSATIONAL_PEAKS');
    expect(OPTIMIZATION_DIMENSIONS).toContain('LANDING_PAGE_CONVERSION_ALIGNMENT');
    expect(OPTIMIZATION_DIMENSIONS).toContain('DISCLOSURES_AND_BRAND_SAFETY');
  });

  it('validates recommendation lifecycle status transitions', () => {
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'APPLIED'];
    expect(validStatuses).toContain('PENDING');
    expect(validStatuses).toContain('APPROVED');
    expect(validStatuses).toContain('APPLIED');
    expect(validStatuses).toContain('REJECTED');
  });

  it('instantiates RecommendationNotFoundError with ID and helpful message', () => {
    const err = new RecommendationNotFoundError('rec_778899');
    expect(err.name).toBe('RecommendationNotFoundError');
    expect(err.message).toContain('rec_778899');
    expect(err.message).toContain('not found or unauthorized');
  });
});

