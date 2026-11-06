// GET & POST /api/v1/projects
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import {
  getProjects,
  createProject,
} from '@/domain/projects/service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');
    const workspaceId = searchParams.get('workspaceId') || undefined;

    if (!orgId) {
      return formatErrorResponse(new Error('X-Organization-Id header or orgId query parameter is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const projects = await getProjects(orgId, workspaceId, user.id);
    return formatSuccessResponse(projects);
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

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    if (!body.workspaceId) {
      return formatErrorResponse(new Error('workspaceId is required'), 'Validation failed', 'VALIDATION_ERROR', 400);
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
      return formatErrorResponse(new Error('Project name must be at least 2 characters'), 'Validation failed', 'VALIDATION_ERROR', 400);
    }

    if (!body.primaryWebsite || typeof body.primaryWebsite !== 'string') {
      return formatErrorResponse(new Error('Valid primaryWebsite URL is required'), 'Validation failed', 'VALIDATION_ERROR', 400);
    }

    const project = await createProject(orgId, user.id, {
      workspaceId: body.workspaceId,
      name: body.name.trim(),
      primaryWebsite: body.primaryWebsite.trim(),
      description: body.description?.trim(),
      industry: body.industry,
      targetCountry: body.targetCountry || 'IN',
      defaultLanguage: body.defaultLanguage || 'en',
      brand: body.brand,
    });

    return formatSuccessResponse(project, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
