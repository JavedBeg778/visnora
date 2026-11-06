// Visnora — Uniform API Handler Helper
// Reference: docs/API_CONTRACT.md

import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from './supabase/server';
import { ForbiddenError } from '@/shared/permissions/rbac';
import { NotFoundError, ValidationError } from '@/domain/organizations/service';

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
  // If authorization header with bearer token is passed
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In production, verify JWT via Supabase client
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      return {
        id: data.user.id,
        email: data.user.email || 'user@visnora.local',
      };
    }
  } catch {
    // Supabase auth service fallback for tests / local development
  }

  // Fallback for local development if headers specify test user
  const devUserId = request.headers.get('x-dev-user-id');
  if (devUserId) {
    return {
      id: devUserId,
      email: request.headers.get('x-dev-user-email') || 'dev@visnora.local',
    };
  }

  return null;
}
