import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class EmployeeSalaryItemRepository {
  async findByUser(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.findMany({
      where: { companyId, userId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findActiveByUser(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.findMany({
      where: { companyId, userId, isActive: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createMany(companyId: string, userId: string, items: Prisma.EmployeeSalaryItemCreateManyInput[]) {
    const data = items.map((item) => ({
      ...item,
      companyId,
      userId,
    }));
    return prisma.employeeSalaryItem.createMany({ data });
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

  async delete(companyId: string, id: string) {
    const existing = await prisma.employeeSalaryItem.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.employeeSalaryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async deleteAllByUser(companyId: string, userId: string) {
    return prisma.employeeSalaryItem.updateMany({
      where: { companyId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
