import { PrismaClient } from '@prisma/client';

interface AuditLogParams {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  orderId?: string;
  customerId?: string;
  articleId?: string;
  changes?: object;
}

/**
 * Create an audit log entry.
 * Silently swallows errors so audit failures never crash the main flow.
 */
export async function createAuditLog(
  prisma: PrismaClient,
  params: AuditLogParams
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        userId: params.userId ?? null,
        orderId: params.orderId ?? null,
        customerId: params.customerId ?? null,
        articleId: params.articleId ?? null,
        changes: params.changes ?? undefined,
      },
    });
  } catch (err) {
    // Audit log failure should not break business logic
    console.error('Failed to write audit log:', err);
  }
}
