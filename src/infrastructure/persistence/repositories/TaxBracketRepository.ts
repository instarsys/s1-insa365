import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class TaxBracketRepository {
  async findByIncomeAndDependents(year: number, income: number, dependents: number) {
    return prisma.taxBracket.findFirst({
      where: {
        year,
        dependents,
        minIncome: { lte: income },
        maxIncome: { gt: income },
      },
    });
  }

  async findAllByYear(year: number) {
    return prisma.taxBracket.findMany({
      where: { year },
      orderBy: [{ dependents: 'asc' }, { minIncome: 'asc' }],
    });
  }

  async createMany(data: Prisma.TaxBracketCreateManyInput[]) {
    return prisma.taxBracket.createMany({ data });
  }

  async deleteByYear(year: number) {
    return prisma.taxBracket.deleteMany({ where: { year } });
  }

  async findById(id: string) {
    return prisma.taxBracket.findUnique({ where: { id } });
  }
}
