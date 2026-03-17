import { prisma } from '../prisma/client';

export class CompanyHolidayRepository {
  async findByYear(companyId: string, year: number) {
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31));
    return prisma.companyHoliday.findMany({
      where: { companyId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });
  }

  async findByPeriod(companyId: string, startDate: Date, endDate: Date) {
    return prisma.companyHoliday.findMany({
      where: { companyId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });
  }

  async create(data: {
    companyId: string;
    date: Date;
    name: string;
    type: string;
    isRecurring: boolean;
  }) {
    return prisma.companyHoliday.upsert({
      where: { companyId_date: { companyId: data.companyId, date: data.date } },
      update: { name: data.name, type: data.type as 'NATIONAL' | 'COMPANY', isRecurring: data.isRecurring },
      create: {
        companyId: data.companyId,
        date: data.date,
        name: data.name,
        type: data.type as 'NATIONAL' | 'COMPANY',
        isRecurring: data.isRecurring,
      },
    });
  }

  async createMany(data: {
    companyId: string;
    date: Date;
    name: string;
    type: string;
    isRecurring: boolean;
  }[]) {
    let count = 0;
    for (const item of data) {
      await this.create(item);
      count++;
    }
    return count;
  }

  async delete(companyId: string, id: string) {
    const existing = await prisma.companyHoliday.findFirst({
      where: { id, companyId },
    });
    if (!existing) return;
    await prisma.companyHoliday.deleteMany({ where: { id, companyId } });
  }
}
