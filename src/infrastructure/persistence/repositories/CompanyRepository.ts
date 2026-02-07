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
}
