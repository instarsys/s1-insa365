import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class SalaryRuleRepository {
  async findAll(companyId: string) {
    return prisma.salaryRule.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByCode(companyId: string, code: string) {
    return prisma.salaryRule.findFirst({
      where: { companyId, code, deletedAt: null },
    });
  }

  async findById(companyId: string, id: string) {
    return prisma.salaryRule.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  async create(companyId: string, data: Prisma.SalaryRuleUncheckedCreateInput) {
    return prisma.salaryRule.create({
      data: { ...data, companyId },
    });
  }

  async update(companyId: string, id: string, data: Prisma.SalaryRuleUpdateInput) {
    const existing = await prisma.salaryRule.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.salaryRule.update({
      where: { id },
      data,
    });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await prisma.salaryRule.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    await prisma.salaryRule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
