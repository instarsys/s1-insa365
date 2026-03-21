import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class CompanyRepository {
  async findById(id: string) {
    return prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async create(data: Prisma.CompanyCreateInput) {
    return prisma.company.create({ data });
  }

  async update(id: string, data: Prisma.CompanyUpdateInput) {
    return prisma.company.update({
      where: { id },
      data,
    });
  }

  async findAll() {
    return prisma.company.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { users: { where: { deletedAt: null } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBusinessNumber(businessNumber: string) {
    return prisma.company.findFirst({
      where: { businessNumber, deletedAt: null },
    });
  }

  async countAll() {
    return prisma.company.count({ where: { deletedAt: null } });
  }
}
