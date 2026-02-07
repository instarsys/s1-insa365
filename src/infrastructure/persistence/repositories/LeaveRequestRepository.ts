import { prisma } from '../prisma/client';
import type { Prisma, LeaveStatus } from '@/generated/prisma/client';

export interface LeaveRequestFilters {
  userId?: string;
  status?: LeaveStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class LeaveRequestRepository {
  async findById(companyId: string, id: string) {
    return prisma.leaveRequest.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { user: { include: { department: true, position: true } } },
    });
  }

  async findAll(companyId: string, filters: LeaveRequestFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const where: Prisma.LeaveRequestWhereInput = { companyId, deletedAt: null };

    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) where.startDate.gte = filters.startDate;
      if (filters.endDate) where.startDate.lte = filters.endDate;
    }

    const [items, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: { user: { include: { department: true, position: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async create(companyId: string, data: Prisma.LeaveRequestUncheckedCreateInput) {
    return prisma.leaveRequest.create({
      data: { ...data, companyId },
      include: { user: { include: { department: true, position: true } } },
    });
  }

  async update(companyId: string, id: string, data: Prisma.LeaveRequestUpdateInput) {
    const existing = await prisma.leaveRequest.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.leaveRequest.update({
      where: { id },
      data,
      include: { user: { include: { department: true, position: true } } },
    });
  }
}
