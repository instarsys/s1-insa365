import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class EmployeeSalaryItemRepository {
  async findByEmployee(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.findMany({
      where: { companyId, userId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findActiveByEmployee(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.findMany({
      where: { companyId, userId, isActive: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: {
    companyId: string;
    userId: string;
    code: string;
    name: string;
    type: string;
    paymentType?: string;
    paymentCycle?: string;
    amount?: number;
    isOrdinaryWage?: boolean;
    isTaxExempt?: boolean;
    taxExemptCode?: string;
    isActive?: boolean;
    sortOrder?: number;
    formula?: string;
  }) {
    return prisma.employeeSalaryItem.create({ data: data as Prisma.EmployeeSalaryItemUncheckedCreateInput });
  }

  async createMany(items: Prisma.EmployeeSalaryItemCreateManyInput[]) {
    const result = await prisma.employeeSalaryItem.createMany({ data: items });
    return result.count;
  }

  async update(companyId: string, id: string, data: Prisma.EmployeeSalaryItemUpdateInput) {
    const existing = await prisma.employeeSalaryItem.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.employeeSalaryItem.update({
      where: { id },
      data,
    });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await prisma.employeeSalaryItem.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.employeeSalaryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async deleteByEmployee(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.updateMany({
      where: { companyId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async findByUserOrdered(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.findMany({
      where: { companyId, userId, deletedAt: null },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async toggleActive(companyId: string, id: string, isActive: boolean) {
    const existing = await prisma.employeeSalaryItem.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.employeeSalaryItem.update({
      where: { id },
      data: { isActive },
    });
  }

  async updateManyInTransaction(companyId: string, updates: Array<{ id: string; data: Prisma.EmployeeSalaryItemUpdateInput }>) {
    const ops = updates.map((u) =>
      prisma.employeeSalaryItem.update({ where: { id: u.id }, data: u.data }),
    );
    return prisma.$transaction(ops);
  }
}
