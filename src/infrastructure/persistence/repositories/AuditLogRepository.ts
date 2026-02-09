import { prisma } from '../prisma/client';
import type { AuditAction, Prisma } from '@/generated/prisma/client';

export class AuditLogRepository {
  async create(data: {
    companyId?: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        action: data.action as AuditAction,
        entityType: data.entityType,
        entityId: data.entityId,
        before: data.before as Prisma.InputJsonValue ?? undefined,
        after: data.after as Prisma.InputJsonValue ?? undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async findAll(companyId: string, filters: {
    entityType?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.AuditLogWhereInput = {
      companyId,
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.action && { action: filters.action as AuditAction }),
      ...(filters.userId && { userId: filters.userId }),
      ...((filters.startDate || filters.endDate) && {
        createdAt: {
          ...(filters.startDate && { gte: new Date(filters.startDate) }),
          ...(filters.endDate && { lte: new Date(filters.endDate) }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        // AuditLog에 user relation이 없으므로 별도 조회가 필요하면 추가
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
