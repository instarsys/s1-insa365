import { prisma } from '../prisma/client';
import type { Prisma, SalaryStatus } from '@/generated/prisma/client';

export interface SalaryCalcFilters {
  status?: SalaryStatus;
  departmentId?: string;
  page?: number;
  limit?: number;
}

export class SalaryCalculationRepository {
  // ─── Port-compatible methods ─────────────────────────────────

  /** 해당 기간 전체 급여계산 조회 (flat array, 페이지네이션 없음) */
  async findByPeriod(companyId: string, year: number, month: number) {
    return prisma.salaryCalculation.findMany({
      where: { companyId, year, month, deletedAt: null },
      include: {
        user: { include: { department: true, position: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });
  }

  async findByEmployeeAndPeriod(companyId: string, userId: string, year: number, month: number) {
    return prisma.salaryCalculation.findFirst({
      where: { companyId, userId, year, month, deletedAt: null },
      include: {
        user: { include: { department: true, position: true } },
      },
    });
  }

  async create(data: Prisma.SalaryCalculationUncheckedCreateInput) {
    return prisma.salaryCalculation.create({
      data,
      include: {
        user: { include: { department: true, position: true } },
      },
    });
  }

  async createMany(dataArr: Prisma.SalaryCalculationCreateManyInput[]) {
    const result = await prisma.salaryCalculation.createMany({ data: dataArr });
    return result.count;
  }

  async update(id: string, data: Prisma.SalaryCalculationUpdateInput) {
    return prisma.salaryCalculation.update({
      where: { id },
      data,
      include: {
        user: { include: { department: true, position: true } },
      },
    });
  }

  /** 기간별 일괄 상태 변경 (DRAFT → CONFIRMED 등) */
  async updateStatus(companyId: string, year: number, month: number, status: string, confirmedBy?: string) {
    const data: Prisma.SalaryCalculationUpdateManyMutationInput = { status: status as SalaryStatus };
    if (status === 'CONFIRMED' && confirmedBy) {
      data.confirmedAt = new Date();
      data.confirmedBy = confirmedBy;
    }
    await prisma.salaryCalculation.updateMany({
      where: { companyId, year, month, deletedAt: null, status: 'DRAFT' },
      data,
    });
  }

  /** 기간별 DRAFT 급여계산 soft delete */
  async deleteByPeriod(companyId: string, year: number, month: number) {
    await prisma.salaryCalculation.updateMany({
      where: { companyId, year, month, deletedAt: null, status: 'DRAFT' },
      data: { deletedAt: new Date() },
    });
  }

  /** 스프레드시트 데이터 조회 */
  async getSpreadsheet(companyId: string, year: number, month: number) {
    const records = await prisma.salaryCalculation.findMany({
      where: { companyId, year, month, deletedAt: null },
      include: {
        user: { include: { department: true, position: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return records.map((r) => ({
      employeeId: r.userId,
      employeeName: r.user?.name ?? '',
      employeeNumber: r.user?.employeeNumber ?? null,
      departmentName: r.user?.department?.name ?? null,
      positionName: r.user?.position?.name ?? null,
      status: r.status,
      basePay: r.basePay,
      fixedAllowances: r.fixedAllowances,
      overtimePay: r.overtimePay,
      nightPay: r.nightPay,
      holidayPay: r.holidayPay,
      variableAllowances: r.variableAllowances,
      totalPay: r.totalPay,
      nationalPension: r.nationalPension,
      healthInsurance: r.healthInsurance,
      longTermCare: r.longTermCare,
      employmentInsurance: r.employmentInsurance,
      incomeTax: r.incomeTax,
      localIncomeTax: r.localIncomeTax,
      totalDeduction: r.totalDeduction,
      netPay: r.netPay,
    }));
  }

  /** 급여대장 데이터 조회 (CONFIRMED/PAID 레코드만) */
  async getLedger(companyId: string, year: number, month: number) {
    const records = await prisma.salaryCalculation.findMany({
      where: {
        companyId, year, month, deletedAt: null,
        status: { in: ['CONFIRMED', 'PAID'] },
      },
      include: {
        user: { include: { department: true, position: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return records.map((r) => ({
      employeeId: r.userId,
      employeeName: r.user?.name ?? '',
      employeeNumber: r.user?.employeeNumber ?? null,
      departmentName: r.user?.department?.name ?? null,
      basePay: r.basePay,
      fixedAllowances: r.fixedAllowances,
      overtimePay: r.overtimePay,
      nightPay: r.nightPay,
      holidayPay: r.holidayPay,
      variableAllowances: r.variableAllowances,
      totalPay: r.totalPay,
      nationalPension: r.nationalPension,
      healthInsurance: r.healthInsurance,
      longTermCare: r.longTermCare,
      employmentInsurance: r.employmentInsurance,
      incomeTax: r.incomeTax,
      localIncomeTax: r.localIncomeTax,
      totalDeduction: r.totalDeduction,
      netPay: r.netPay,
    }));
  }

  /** 급여 이력 조회 (기간별 그룹, 페이지네이션) */
  async getHistory(companyId: string, page = 1, limit = 12) {
    // Group by year/month using raw aggregation
    const allRecords = await prisma.salaryCalculation.findMany({
      where: { companyId, deletedAt: null },
      select: {
        year: true, month: true, status: true,
        totalPay: true, totalDeduction: true, netPay: true,
        confirmedAt: true, confirmedBy: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Group by year/month
    const groupMap = new Map<string, typeof allRecords>();
    for (const r of allRecords) {
      const key = `${r.year}-${r.month}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(r);
    }

    const groups = Array.from(groupMap.entries()).map(([, records]) => {
      const first = records[0];
      const confirmedRecord = records.find((r) => r.confirmedAt);
      const hasConfirmed = records.some((r) => r.status === 'CONFIRMED' || r.status === 'PAID');
      const hasDraft = records.some((r) => r.status === 'DRAFT');
      const status = hasConfirmed ? 'CONFIRMED' : hasDraft ? 'DRAFT' : records[0].status;

      return {
        year: first.year,
        month: first.month,
        status,
        employeeCount: records.length,
        totalPay: records.reduce((s, r) => s + Number(r.totalPay), 0),
        totalDeduction: records.reduce((s, r) => s + Number(r.totalDeduction), 0),
        totalNetPay: records.reduce((s, r) => s + Number(r.netPay), 0),
        confirmedAt: confirmedRecord?.confirmedAt?.toISOString() ?? null,
        confirmedBy: confirmedRecord?.confirmedBy ?? null,
      };
    });

    const total = groups.length;
    const items = groups.slice((page - 1) * limit, page * limit);

    return { items, total, page, limit };
  }

  /** 기간별 요약 통계 */
  async getSummary(companyId: string, year: number, month: number) {
    const records = await prisma.salaryCalculation.findMany({
      where: { companyId, year, month, deletedAt: null },
      select: {
        status: true,
        totalPay: true,
        totalDeduction: true,
        netPay: true,
      },
    });

    if (records.length === 0) return null;

    const calculatedCount = records.filter((r) => r.status !== 'FAILED' && r.status !== 'SKIPPED').length;
    const confirmedCount = records.filter((r) => r.status === 'CONFIRMED' || r.status === 'PAID').length;
    const failedCount = records.filter((r) => r.status === 'FAILED').length;
    const skippedCount = records.filter((r) => r.status === 'SKIPPED').length;

    const hasConfirmed = confirmedCount > 0;
    const hasDraft = records.some((r) => r.status === 'DRAFT');
    const status = hasConfirmed ? 'CONFIRMED' : hasDraft ? 'DRAFT' : records[0].status;

    return {
      totalEmployees: records.length,
      calculatedCount,
      confirmedCount,
      failedCount,
      skippedCount,
      totalPay: records.reduce((s, r) => s + Number(r.totalPay), 0),
      totalDeduction: records.reduce((s, r) => s + Number(r.totalDeduction), 0),
      totalNetPay: records.reduce((s, r) => s + Number(r.netPay), 0),
      status,
    };
  }

  // ─── 추가 유틸 메서드 (API 라우트 전환 시 필요) ────────────────

  /** 페이지네이션 포함 조회 (관리자 스프레드시트 UI용) */
  async findByPeriodPaginated(companyId: string, year: number, month: number, filters: SalaryCalcFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const where: Prisma.SalaryCalculationWhereInput = {
      companyId, year, month, deletedAt: null,
    };

    if (filters.status) where.status = filters.status;
    if (filters.departmentId) {
      where.user = { departmentId: filters.departmentId, deletedAt: null };
    }

    const [items, total] = await Promise.all([
      prisma.salaryCalculation.findMany({
        where,
        include: {
          user: { include: { department: true, position: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.salaryCalculation.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** 단건 상태 변경 (ID 기반) */
  async updateStatusById(companyId: string, id: string, status: SalaryStatus, extra?: { confirmedBy?: string }) {
    const existing = await prisma.salaryCalculation.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) return null;
    const data: Prisma.SalaryCalculationUpdateInput = { status };
    if (status === 'CONFIRMED' && extra?.confirmedBy) {
      data.confirmedAt = new Date();
      data.confirmedBy = extra.confirmedBy;
    }
    return prisma.salaryCalculation.update({ where: { id }, data });
  }

  async countDraftByMonth(companyId: string, year: number, month: number) {
    return prisma.salaryCalculation.count({
      where: { companyId, year, month, status: 'DRAFT', deletedAt: null },
    });
  }

  async sumTotalPayByMonth(companyId: string, year: number, month: number) {
    const result = await prisma.salaryCalculation.aggregate({
      where: { companyId, year, month, deletedAt: null, status: { not: 'FAILED' } },
      _sum: { totalPay: true },
    });
    return Number(result._sum.totalPay ?? 0);
  }

  async revertConfirmedToDraft(companyId: string, year: number, month: number) {
    const result = await prisma.salaryCalculation.updateMany({
      where: { companyId, year, month, status: 'CONFIRMED', deletedAt: null },
      data: { status: 'DRAFT', confirmedAt: null, confirmedBy: null },
    });
    return result.count;
  }

  /** 다중 기간 확정/지급 급여 조회 (리포트용) */
  async findConfirmedByPeriods(companyId: string, periods: { year: number; month: number }[]) {
    if (periods.length === 0) return [];
    return prisma.salaryCalculation.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ['CONFIRMED', 'PAID'] },
        OR: periods.map((p) => ({ year: p.year, month: p.month })),
      },
      select: {
        year: true,
        month: true,
        totalPay: true,
        netPay: true,
      },
    });
  }

  /** 확정/지급 급여 + 부서 정보 (부서별 비용 리포트용) */
  async findConfirmedWithDepartment(companyId: string, year: number, month: number) {
    return prisma.salaryCalculation.findMany({
      where: {
        companyId,
        year,
        month,
        deletedAt: null,
        status: { in: ['CONFIRMED', 'PAID'] },
      },
      include: {
        user: { select: { departmentId: true } },
      },
    });
  }

  /** 확정/지급 급여 + 보험 모드 정보 (보험 현황 리포트용) */
  async findConfirmedWithInsuranceInfo(companyId: string, year: number, month: number) {
    return prisma.salaryCalculation.findMany({
      where: {
        companyId,
        year,
        month,
        deletedAt: null,
        status: { in: ['CONFIRMED', 'PAID'] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            nationalPensionMode: true,
            healthInsuranceMode: true,
            employmentInsuranceMode: true,
          },
        },
      },
    });
  }

  /** Super Admin 전용: 전역 상태별 급여계산 건수 (companyId 무관) */
  async groupByStatusGlobal(year: number, month: number) {
    const result = await prisma.salaryCalculation.groupBy({
      by: ['status'],
      where: { year, month },
      _count: { id: true },
    });
    return result.map((r) => ({ status: r.status, count: r._count.id }));
  }

  async findByIdWithDetails(companyId: string, id: string, userId?: string) {
    const where: Prisma.SalaryCalculationWhereInput = { id, companyId, deletedAt: null };
    if (userId) where.userId = userId;
    return prisma.salaryCalculation.findFirst({
      where,
      include: {
        user: { include: { department: true, position: true } },
      },
    });
  }

  /** 직원별 급여 이력 (직원 상세 페이지용) */
  async getEmployeeHistory(companyId: string, userId: string, page = 1, limit = 12) {
    const where: Prisma.SalaryCalculationWhereInput = {
      companyId, userId, deletedAt: null,
    };

    const [items, total] = await Promise.all([
      prisma.salaryCalculation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.salaryCalculation.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
