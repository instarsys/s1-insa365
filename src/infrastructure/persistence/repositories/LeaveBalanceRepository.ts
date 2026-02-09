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

  async upsertBalance(companyId: string, userId: string, year: number, data: { totalDays: number; usedDays: number; remainingDays: number }) {
    const existing = await prisma.leaveBalance.findFirst({
      where: { companyId, userId, year },
    });
    if (existing) {
      return prisma.leaveBalance.update({
        where: { id: existing.id },
        data,
      });
    }
    return prisma.leaveBalance.create({
      data: { companyId, userId, year, ...data },
    });
  }

  /** 총 일수 변경 upsert: usedDays를 유지하면서 totalDays와 remainingDays 갱신 */
  async upsertTotalDays(companyId: string, userId: string, year: number, totalDays: number) {
    const existing = await prisma.leaveBalance.findFirst({
      where: { companyId, userId, year },
      select: { usedDays: true },
    });
    const usedDays = existing ? Number(existing.usedDays) : 0;
    return prisma.leaveBalance.upsert({
      where: {
        companyId_userId_year: { companyId, userId, year },
      },
      update: {
        totalDays,
        remainingDays: totalDays - usedDays,
      },
      create: {
        companyId,
        userId,
        year,
        totalDays,
        usedDays: 0,
        remainingDays: totalDays,
      },
    });
  }

  /** 연도별 전체 잔액 조회 (user.name + department.name 포함) */
  async findAllByYearWithUser(companyId: string, year: number) {
    return prisma.leaveBalance.findMany({
      where: { companyId, year },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            department: { select: { name: true } },
          },
        },
      },
    });
  }
}
