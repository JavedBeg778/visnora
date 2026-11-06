import { describe, it, expect } from 'vitest';
import {
  assertPermission,
  hasPermission,
  ForbiddenError,
} from '../../packages/shared/permissions/rbac';

describe('Role-Based Access Control (RBAC)', () => {
  it('allows higher privilege roles to perform lower privilege operations', () => {
    expect(hasPermission('OWNER', 'ADMIN')).toBe(true);
    expect(hasPermission('OWNER', 'ANALYST')).toBe(true);
    expect(hasPermission('ADMIN', 'ANALYST')).toBe(true);
    expect(hasPermission('ANALYST', 'VIEWER')).toBe(true);
  });

  it('rejects lower privilege roles from performing higher privilege operations', () => {
    expect(hasPermission('VIEWER', 'ANALYST')).toBe(false);
    expect(hasPermission('ANALYST', 'ADMIN')).toBe(false);
    expect(hasPermission('ADMIN', 'OWNER')).toBe(false);
  });

  it('throws ForbiddenError when assertPermission fails', () => {
    expect(() => assertPermission('VIEWER', 'ADMIN')).toThrow(ForbiddenError);
    expect(() => assertPermission('ANALYST', 'OWNER')).toThrow(ForbiddenError);
    expect(() => assertPermission('ADMIN', 'ADMIN')).not.toThrow();
    expect(() => assertPermission('OWNER', 'VIEWER')).not.toThrow();
  });
});

