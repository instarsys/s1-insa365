import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class LegalParameterRepository {
  async findAll() {
    return prisma.legalParameter.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async findByKey(key: string) {
    return prisma.legalParameter.findUnique({
      where: { key },
    });
  }

  async findByCategory(category: string) {
    return prisma.legalParameter.findMany({
      where: { category: category as Prisma.EnumLegalParameterCategoryFilter['equals'] },
      orderBy: { key: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.legalParameter.findUnique({ where: { id } });
  }

  async create(data: Prisma.LegalParameterCreateInput) {
    return prisma.legalParameter.create({ data });
  }

  async update(id: string, data: Prisma.LegalParameterUpdateInput) {
    return prisma.legalParameter.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.legalParameter.delete({ where: { id } });
  }
}
