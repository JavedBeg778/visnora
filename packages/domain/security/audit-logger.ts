// Visnora — Immutable Audit Logging Service
// Reference: docs/SECURITY.md & Phase 1 Audit Finding 12

import { prisma } from '../../database/src/client';

export interface AuditEventInput {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  targetEntity: string;
  targetId: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
}

/**
 * Record an immutable audit log entry.
 * Can be used with a standard PrismaClient or inside an active interactive transaction ($transaction).
 */
export async function recordAuditEvent(
  txOrPrisma: any,
  event: AuditEventInput
): Promise<void> {
  const client = txOrPrisma || prisma;

  try {
    await client.auditLog.create({
      data: {
        organizationId: event.organizationId,
        actorUserId: event.actorUserId || null,
        action: event.action,
        targetEntity: event.targetEntity,
        targetId: event.targetId,
        metadata: event.metadata || {},
        ipAddress: event.ipAddress || null,
      },
    });
  } catch (error) {
    // Audit log failures should be surfaced or logged without silently swallowing
    console.error('[AuditLogger] Failed to write audit log entry:', {
      action: event.action,
      targetEntity: event.targetEntity,
      targetId: event.targetId,
      error,
    });
  }
}

/**
 * Query audit logs for an organization with pagination and security checks.
 */
export async function getOrganizationAuditLogs(
  organizationId: string,
  options: {
    limit?: number;
    offset?: number;
    targetEntity?: string;
    action?: string;
  } = {}
) {
  const limit = Math.min(Math.max(options.limit || 50, 1), 100);
  const offset = Math.max(options.offset || 0, 0);

  const where: any = { organizationId };
  if (options.targetEntity) {
    where.targetEntity = options.targetEntity;
  }
  if (options.action) {
    where.action = options.action;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    limit,
    offset,
  };
}

