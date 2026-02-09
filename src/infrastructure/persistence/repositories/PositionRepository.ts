import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class PositionRepository {
  async findAll(companyId: string) {
    return prisma.position.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { level: 'asc' },
    });
  }

  async findById(companyId: string, id: string) {
    return prisma.position.findFirst({
      where: { id, companyId, deletedAt: null },
    });
  }

  async create(companyId: string, data: Prisma.PositionUncheckedCreateInput) {
    return prisma.position.create({
      data: { ...data, companyId },
    });
  }

  async update(companyId: string, id: string, data: Prisma.PositionUpdateInput) {
    const existing = await prisma.position.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.position.update({
      where: { id },
      data,
    });
  }

  async softDelete(companyId: string, id: string) {
    const existing = await prisma.position.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    await prisma.position.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAllWithUserCount(companyId: string) {
    return prisma.position.findMany({
      where: { companyId, deletedAt: null },
      include: { _count: { select: { users: { where: { deletedAt: null } } } } },
      orderBy: { level: 'asc' },
    });
  }

  async findByName(companyId: string, name: string) {
    return prisma.position.findFirst({
      where: { companyId, name, deletedAt: null },
    });
  }

  async findByNameExcept(companyId: string, name: string, excludeId: string) {
    return prisma.position.findFirst({
      where: { companyId, name, deletedAt: null, NOT: { id: excludeId } },
    });
  }
}
