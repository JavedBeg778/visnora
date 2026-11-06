// Visnora — Role-Based Access Control (RBAC) Engine

import { OrgRole } from '../types';

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ANALYST: 2,
  ADMIN: 3,
  OWNER: 4,
};

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Validates that the active member role meets or exceeds the required role level.
 * Throws ForbiddenError if the role is insufficient.
 */
export function assertPermission(currentRole: OrgRole, requiredRole: OrgRole): void {
  if (ROLE_HIERARCHY[currentRole] < ROLE_HIERARCHY[requiredRole]) {
    throw new ForbiddenError(
      `Permission denied: Operation requires ${requiredRole} privilege, but user holds ${currentRole}.`
    );
  }
}

/**
 * Returns true if current role satisfies required role level, false otherwise.
 */
export function hasPermission(currentRole: OrgRole, requiredRole: OrgRole): boolean {
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
}

