import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export interface NotificationFilters {
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export class NotificationRepository {
  async findByUser(companyId: string, userId: string, filters: NotificationFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const where: Prisma.NotificationWhereInput = { companyId, userId };

    if (filters.isRead !== undefined) where.isRead = filters.isRead;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async create(data: Prisma.NotificationUncheckedCreateInput) {
    return prisma.notification.create({ data });
  }

  async markRead(companyId: string, userId: string, id: string) {
    const existing = await prisma.notification.findFirst({
      where: { id, companyId, userId },
    });
    if (!existing) return null;
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(companyId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { companyId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(companyId: string, userId: string) {
    return prisma.notification.count({
      where: { companyId, userId, isRead: false },
    });
  }
}
