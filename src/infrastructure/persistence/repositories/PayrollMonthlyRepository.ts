import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class PayrollMonthlyRepository {
  async findByEmployeeAndPeriod(companyId: string, userId: string, year: number, month: number) {
    return prisma.payrollMonthly.findFirst({
      where: { companyId, userId, year, month },
    });
  }

  async findByEmployeeAndYear(companyId: string, userId: string, year: number) {
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

  async create(data: Prisma.PayrollMonthlyUncheckedCreateInput) {
    return prisma.payrollMonthly.create({ data });
  }

  async createMany(dataArr: Prisma.PayrollMonthlyCreateManyInput[]) {
    const result = await prisma.payrollMonthly.createMany({ data: dataArr });
    return result.count;
  }

  async deleteByPeriod(companyId: string, year: number, month: number) {
    await prisma.payrollMonthly.deleteMany({
      where: { companyId, year, month },
    });
  }

  async deleteByPeriodAndUserIds(companyId: string, year: number, month: number, userIds: string[]) {
    await prisma.payrollMonthly.deleteMany({
      where: { companyId, year, month, userId: { in: userIds } },
    });
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

  async findByYear(companyId: string, year: number) {
    return prisma.payrollMonthly.findMany({
      where: { companyId, year },
      orderBy: { month: 'asc' },
    });
  }

  async findByYearHalf(companyId: string, year: number, half: 1 | 2) {
    const monthStart = half === 1 ? 1 : 7;
    const monthEnd = half === 1 ? 6 : 12;
    return prisma.payrollMonthly.findMany({
      where: { companyId, year, month: { gte: monthStart, lte: monthEnd } },
      orderBy: [{ userId: 'asc' }, { month: 'asc' }],
    });
  }

  async findByPeriodAndGroup(companyId: string, year: number, month: number, payrollGroupId?: string) {
    return prisma.payrollMonthly.findMany({
      where: { companyId, year, month, ...(payrollGroupId && { payrollGroupId }) },
      include: { user: { include: { department: true } } },
      orderBy: { employeeName: 'asc' },
    });
  }
}
