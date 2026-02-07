import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class MinimumWageRepository {
  async findByYear(year: number) {
    return prisma.minimumWage.findFirst({
      where: { year },
    });
  }

  async findAll() {
    return prisma.minimumWage.findMany({
      orderBy: { year: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.minimumWage.findUnique({ where: { id } });
  }

  async create(data: Prisma.MinimumWageCreateInput) {
    return prisma.minimumWage.create({ data });
  }

  async update(id: string, data: Prisma.MinimumWageUpdateInput) {
    return prisma.minimumWage.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.minimumWage.delete({ where: { id } });
  }
}
