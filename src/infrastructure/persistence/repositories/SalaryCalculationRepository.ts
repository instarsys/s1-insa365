import { prisma } from '../prisma/client';
import type { Prisma, SalaryStatus } from '@/generated/prisma/client';

export interface SalaryCalcFilters {
  status?: SalaryStatus;
  departmentId?: string;
  page?: number;
  limit?: number;
}

export class SalaryCalculationRepository {
  async findByPeriod(companyId: string, year: number, month: number, filters: SalaryCalcFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const where: Prisma.SalaryCalculationWhereInput = {
      companyId,
      year,
      month,
      deletedAt: null,
    };

    if (filters.status) where.status = filters.status;
    if (filters.departmentId) {
      where.user = { departmentId: filters.departmentId, deletedAt: null };
    }

    const [items, total] = await Promise.all([
      prisma.salaryCalculation.findMany({
        where,
        include: {
          user: { include: { department: true, position: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.salaryCalculation.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findByEmployeeAndPeriod(companyId: string, userId: string, year: number, month: number) {
    return prisma.salaryCalculation.findFirst({
      where: { companyId, userId, year, month, deletedAt: null },
      include: {
        user: { include: { department: true, position: true } },
      },
    });
  }

  async create(data: Prisma.SalaryCalculationUncheckedCreateInput) {
    return prisma.salaryCalculation.create({
      data,
      include: {
        user: { include: { department: true, position: true } },
      },
    });
  }

  async update(companyId: string, id: string, data: Prisma.SalaryCalculationUpdateInput) {
    const existing = await prisma.salaryCalculation.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.salaryCalculation.update({
      where: { id },
      data,
      include: {
        user: { include: { department: true, position: true } },
      },
    });
  }

  async updateStatus(companyId: string, id: string, status: SalaryStatus, extra?: { confirmedBy?: string }) {
    const existing = await prisma.salaryCalculation.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    const data: Prisma.SalaryCalculationUpdateInput = { status };
    if (status === 'CONFIRMED' && extra?.confirmedBy) {
      data.confirmedAt = new Date();
      data.confirmedBy = extra.confirmedBy;
    }
    return prisma.salaryCalculation.update({
      where: { id },
      data,
    });
  }

  async updateStatusBulk(companyId: string, year: number, month: number, status: SalaryStatus, confirmedBy?: string) {
    const data: Prisma.SalaryCalculationUpdateManyMutationInput = { status };
    if (status === 'CONFIRMED' && confirmedBy) {
      data.confirmedAt = new Date();
      data.confirmedBy = confirmedBy;
    }
    return prisma.salaryCalculation.updateMany({
      where: { companyId, year, month, deletedAt: null, status: 'DRAFT' },
      data,
    });
  }

  async getHistory(companyId: string, userId: string, page = 1, limit = 12) {
    const where: Prisma.SalaryCalculationWhereInput = {
      companyId,
      userId,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      prisma.salaryCalculation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.salaryCalculation.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async deleteByPeriod(companyId: string, year: number, month: number) {
    return prisma.salaryCalculation.updateMany({
      where: { companyId, year, month, deletedAt: null, status: 'DRAFT' },
      data: { deletedAt: new Date() },
    });
  }
}
