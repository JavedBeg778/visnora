// GET /api/v1/organizations & POST /api/v1/organizations
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import {
  getOrganizationsForUser,
  createOrganizationWithDefaults,
} from '@/domain/organizations/service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const orgs = await getOrganizationsForUser(user.id);
    return formatSuccessResponse(orgs);
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

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
      return formatErrorResponse(new Error('Organization name must be at least 2 characters'), 'Validation failed', 'VALIDATION_ERROR', 400);
    }

    const result = await createOrganizationWithDefaults({
      name: body.name.trim(),
      website: body.website?.trim(),
      orgType: body.orgType || 'business',
      countryCode: body.countryCode || 'IN',
      billingEmail: body.billingEmail?.trim() || user.email,
      userId: user.id,
      workspaceName: body.workspaceName?.trim() || 'Primary Workspace',
      projectName: body.projectName?.trim(),
      primaryWebsite: body.primaryWebsite?.trim(),
      industry: body.industry,
    });

    return formatSuccessResponse(result, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
