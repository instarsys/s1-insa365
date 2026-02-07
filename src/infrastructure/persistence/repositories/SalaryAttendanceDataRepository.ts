import { prisma } from '../prisma/client';

export class SalaryAttendanceDataRepository {
  async findByPeriod(companyId: string, userId: string, year: number, month: number) {
    return prisma.salaryAttendanceData.findFirst({
      where: { companyId, userId, year, month },
      orderBy: { version: 'desc' },
    });
  }

  async findAllByPeriod(companyId: string, year: number, month: number) {
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
}
