// POST /api/v1/prompts/generate
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { generatePromptSuggestionsForProject } from '@/domain/ai-visibility/prompt-service';
import { GeneratePromptsSchema } from '@/shared/validation/index';

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

    const validated = GeneratePromptsSchema.parse(body);
    const suggestions = await generatePromptSuggestionsForProject(orgId, projectId, {
      count: validated.count,
      categories: validated.categories,
    });

    return formatSuccessResponse(suggestions);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
