// Visnora — Uniform API Handler Helper
// Reference: docs/API_CONTRACT.md

import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from './supabase/server';
import { assertPermission, ForbiddenError } from '@/shared/permissions/rbac';
import type { OrgRole } from '@/shared/types/index';
import { NotFoundError, ValidationError } from '@/domain/organizations/service';
import { prisma } from '@/database/src/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export function formatSuccessResponse<T>(data: T, status = 200) {
  const traceId = crypto.randomUUID();
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        traceId,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

export function formatErrorResponse(
  error: any,
  defaultMessage = 'Internal server error',
  defaultCode = 'INTERNAL_ERROR',
  defaultStatus = 500
) {
  const traceId = crypto.randomUUID();
  let status = defaultStatus;
  let code = defaultCode;
  let message = defaultMessage;
  let details: any = undefined;

  if (error instanceof ForbiddenError) {
    status = 403;
    code = 'FORBIDDEN';
    message = error.message;
  } else if (error instanceof NotFoundError) {
    status = 404;
    code = 'NOT_FOUND';
    message = error.message;
  } else if (error instanceof ValidationError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        traceId,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();

  // If authorization header with bearer token is passed (e.g. mobile client or API integration)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data?.user) {
          return {
            id: data.user.id,
            email: data.user.email || 'user@visnora.local',
          };
        }
      } catch (tokenErr) {
        // Fall through to cookie verification
      }
    }
  }

  // Cookie-based session verification (browser client)
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      return {
        id: data.user.id,
        email: data.user.email || 'user@visnora.local',
      };
    }
  } catch {
    // Supabase auth service fallback
  }

  // Strictly gate dev test user fallback to test environment or explicit opt-in
  if (process.env.NODE_ENV === 'test' || process.env.ENABLE_DEV_AUTH_BYPASS === 'true') {
    const devUserId = request.headers.get('x-dev-user-id');
    if (devUserId) {
      return {
        id: devUserId,
        email: request.headers.get('x-dev-user-email') || 'dev@visnora.local',
      };
    }
  }

  return null;
}


/**
 * Validates that the authenticated user is an active member of the requested
 * organization and that the project (and optional brand) belong to that tenant.
 */
export async function assertOrganizationAccess(
  organizationId: string,
  userId: string,
  requiredRole: OrgRole = 'VIEWER'
): Promise<void> {
  const membership = await prisma.organizationMember.findUnique({
    where: { uq_org_user: { organizationId, userId } },
    select: { status: true },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError('You are not an active member of this organization.');
  }
}

export async function assertProjectAccess(
  organizationId: string,
  projectId: string,
  userId: string,
  brandId?: string,
  requiredRole: OrgRole = 'VIEWER'
): Promise<void> {
  await assertOrganizationAccess(organizationId, userId, requiredRole);

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, isArchived: false },
    select: { id: true },
  });

  if (!project) throw new NotFoundError('Project not found in this organization.');

  if (brandId) {
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, organizationId, projectId, isArchived: false },
      select: { id: true },
    });
    if (!brand) throw new NotFoundError('Brand not found in this project.');
  }
}

export function parseDateRangeDays(value: string | null, defaultValue = 30): number {
  if (value === null) return defaultValue;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new ValidationError('days must be an integer between 1 and 365.');
  }
  return days;
}
