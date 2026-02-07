import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class LeaveBalanceRepository {
  async findByUserAndYear(companyId: string, userId: string, year: number) {
    return prisma.leaveBalance.findFirst({
      where: { companyId, userId, year },
    });
  }

  async findAllByYear(companyId: string, year: number) {
    return prisma.leaveBalance.findMany({
      where: { companyId, year },
      include: { user: { include: { department: true, position: true } } },
      orderBy: { user: { name: 'asc' } },
    });
  }

  async create(companyId: string, data: Prisma.LeaveBalanceUncheckedCreateInput) {
    return prisma.leaveBalance.create({
      data: { ...data, companyId },
    });
  }

  async update(companyId: string, id: string, data: Prisma.LeaveBalanceUpdateInput) {
    const existing = await prisma.leaveBalance.findFirst({
      where: { id, companyId },
    });
    if (!existing) return null;
    return prisma.leaveBalance.update({
      where: { id },
      data,
    });
  }
}
