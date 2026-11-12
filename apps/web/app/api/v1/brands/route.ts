// GET & POST /api/v1/brands
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import {
  getBrands,
  createBrand,
} from '@/domain/ai-visibility/brand-service';
import { CreateBrandSchema } from '@/shared/validation/index';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');
    const projectId = searchParams.get('projectId') || undefined;

    if (!orgId) {
      return formatErrorResponse(
        new Error('X-Organization-Id header or orgId query parameter is required'),
        'Bad request',
        'VALIDATION_ERROR',
        400
      );
    }

    const brands = await getBrands(orgId, projectId);
    return formatSuccessResponse(brands);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;
    const projectId = body.projectId;

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    if (!projectId) {
      return formatErrorResponse(new Error('projectId is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const validated = CreateBrandSchema.parse(body);
    const brand = await createBrand(orgId, projectId, validated);

    return formatSuccessResponse(brand, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

