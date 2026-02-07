import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class InsuranceRateRepository {
  async findByDateAndType(type: string, date: Date) {
    return prisma.insuranceRate.findFirst({
      where: {
        type,
        effectiveStartDate: { lte: date },
        effectiveEndDate: { gte: date },
      },
    });
  }

  async findAllByDate(date: Date) {
    return prisma.insuranceRate.findMany({
      where: {
        effectiveStartDate: { lte: date },
        effectiveEndDate: { gte: date },
      },
      orderBy: { type: 'asc' },
    });
  }

  async findAll(page = 1, limit = 50) {
    const [items, total] = await Promise.all([
      prisma.insuranceRate.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ type: 'asc' }, { effectiveStartDate: 'desc' }],
      }),
      prisma.insuranceRate.count(),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    return prisma.insuranceRate.findUnique({ where: { id } });
  }

  async create(data: Prisma.InsuranceRateCreateInput) {
    return prisma.insuranceRate.create({ data });
  }

  async update(id: string, data: Prisma.InsuranceRateUpdateInput) {
    return prisma.insuranceRate.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.insuranceRate.delete({ where: { id } });
  }
}
