import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class TaxExemptLimitRepository {
  async findByYear(year: number) {
    return prisma.taxExemptLimit.findMany({
      where: { year },
      orderBy: { code: 'asc' },
    });
  }

  async findByYearAndCode(year: number, code: string) {
    return prisma.taxExemptLimit.findFirst({
      where: { year, code },
    });
  }

  async findById(id: string) {
    return prisma.taxExemptLimit.findUnique({ where: { id } });
  }

  async create(data: Prisma.TaxExemptLimitCreateInput) {
    return prisma.taxExemptLimit.create({ data });
  }

  async update(id: string, data: Prisma.TaxExemptLimitUpdateInput) {
    return prisma.taxExemptLimit.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.taxExemptLimit.delete({ where: { id } });
  }
}
