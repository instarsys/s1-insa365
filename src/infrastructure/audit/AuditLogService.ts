import { prisma } from '@/infrastructure/persistence/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { AuditAction } from '@/generated/prisma/client';

export interface AuditLogParams {
  userId?: string;
  companyId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  entityType?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

class AuditLogService {
  async log(params: AuditLogParams): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        companyId: params.companyId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before as Prisma.InputJsonValue ?? undefined,
        after: params.after as Prisma.InputJsonValue ?? undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async findByEntity(companyId: string, entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { companyId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCompany(companyId: string, filters: AuditLogFilters = {}) {
    const { entityType, action, userId, startDate, endDate } = filters;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      companyId,
      ...(entityType && { entityType }),
      ...(action && { action }),
      ...(userId && { userId }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}

export const auditLogService = new AuditLogService();
