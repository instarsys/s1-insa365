import { prisma } from '../prisma/client';
import type { Prisma } from '@/generated/prisma/client';

export class SalaryAttendanceDataRepository {
  async findByEmployeeAndPeriod(companyId: string, userId: string, year: number, month: number) {
    return prisma.salaryAttendanceData.findFirst({
      where: { companyId, userId, year, month },
      orderBy: { version: 'desc' },
    });
  }

  async findByPeriod(companyId: string, year: number, month: number) {
    // Get latest version for each user
    const data = await prisma.salaryAttendanceData.findMany({
      where: { companyId, year, month },
      orderBy: { version: 'desc' },
    });

    // Deduplicate by userId (keep latest version)
    const seen = new Set<string>();
    return data.filter((d) => {
      if (seen.has(d.userId)) return false;
      seen.add(d.userId);
      return true;
    });
  }

  async create(data: Prisma.SalaryAttendanceDataUncheckedCreateInput) {
    return prisma.salaryAttendanceData.create({ data });
  }

  /** 지정 기간의 스냅샷 전체 삭제 */
  async deleteByPeriod(companyId: string, year: number, month: number) {
    const result = await prisma.salaryAttendanceData.deleteMany({
      where: { companyId, year, month },
    });
    return result.count;
  }

  async createMany(dataArr: Prisma.SalaryAttendanceDataCreateManyInput[]) {
    const result = await prisma.salaryAttendanceData.createMany({ data: dataArr });
    return result.count;
  }
}
