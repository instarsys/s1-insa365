import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class DepartmentRepository {
  async findAll(companyId: string) {
    return prisma.department.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(companyId: string, id: string) {
    return prisma.department.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  async create(companyId: string, data: Prisma.DepartmentUncheckedCreateInput) {
    return prisma.department.create({
      data: { ...data, companyId },
    });
  }

  async update(companyId: string, id: string, data: Prisma.DepartmentUpdateInput) {
    const existing = await prisma.department.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.department.update({
      where: { id },
      data,
    });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await prisma.department.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    await prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAllWithUserCount(companyId: string) {
    return prisma.department.findMany({
      where: { companyId, deletedAt: null },
      include: { _count: { select: { users: { where: { deletedAt: null } } } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByName(companyId: string, name: string) {
    return prisma.department.findFirst({
      where: { companyId, name, deletedAt: null },
    });
  }

  async findByNameExcept(companyId: string, name: string, excludeId: string) {
    return prisma.department.findFirst({
      where: { companyId, name, deletedAt: null, NOT: { id: excludeId } },
    });
  }
}
