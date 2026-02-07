import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class PayrollMonthlyRepository {
  async findByPeriod(companyId: string, userId: string, year: number) {
    return prisma.payrollMonthly.findMany({
      where: { companyId, userId, year },
      orderBy: { month: 'asc' },
    });
  }

  async findByYearMonth(companyId: string, year: number, month: number) {
    return prisma.payrollMonthly.findMany({
      where: { companyId, year, month },
      include: { user: { include: { department: true, position: true } } },
      orderBy: { user: { name: 'asc' } },
    });
  }

  async createMany(data: Prisma.PayrollMonthlyCreateManyInput[]) {
    return prisma.payrollMonthly.createMany({ data });
  }

  async upsert(companyId: string, userId: string, year: number, month: number, data: Prisma.PayrollMonthlyUncheckedCreateInput) {
    return prisma.payrollMonthly.upsert({
      where: {
        companyId_userId_year_month: { companyId, userId, year, month },
      },
      create: { ...data, companyId, userId, year, month },
      update: data,
    });
  }
}
