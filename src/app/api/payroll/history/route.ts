import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { page, limit, userId } = parseSearchParams(url);
  const payrollGroupId = url.searchParams.get('payrollGroupId') || undefined;

  // EMPLOYEE sees own history only
  const targetUserId = auth.role === 'EMPLOYEE' ? auth.userId : (userId ?? undefined);

  const { payrollMonthlyRepo } = getContainer();

  if (targetUserId) {
    // 개인 급여 이력 — PayrollMonthly 스냅샷에서 읽기
    const allRecords = await payrollMonthlyRepo.findByEmployeeAndYear(auth.companyId, targetUserId, 0);
    // year=0이면 전체 조회가 안 되므로, 별도 조회
    const records = await (payrollMonthlyRepo as { findByEmployee?: (companyId: string, userId: string, page: number, limit: number) => Promise<{ items: unknown[]; total: number }> }).findByEmployee?.(auth.companyId, targetUserId, page ?? 1, limit ?? 12)
      ?? { items: allRecords, total: allRecords.length };

    const mapped = (records.items as Array<Record<string, unknown>>).map((r) => ({
      year: r.year,
      month: r.month,
      totalEmployees: 1,
      totalPay: Number(r.totalPay),
      totalDeduction: Number(r.nationalPension ?? 0) + Number(r.healthInsurance ?? 0) + Number(r.longTermCare ?? 0) +
        Number(r.employmentInsurance ?? 0) + Number(r.incomeTax ?? 0) + Number(r.localIncomeTax ?? 0),
      totalNetPay: Number(r.netPay),
      status: 'CONFIRMED',
      payItems: r.payItemsSnapshot ?? [],
      deductionItems: r.deductionItemsSnapshot ?? [],
      nationalPension: Number(r.nationalPension ?? 0),
      healthInsurance: Number(r.healthInsurance ?? 0),
      longTermCare: Number(r.longTermCare ?? 0),
      employmentInsurance: Number(r.employmentInsurance ?? 0),
      incomeTax: Number(r.incomeTax ?? 0),
      localIncomeTax: Number(r.localIncomeTax ?? 0),
      netPay: Number(r.netPay),
    }));

    return successResponse({ items: mapped, total: records.total, page: page ?? 1, limit: limit ?? 12, totalPages: Math.ceil(records.total / (limit ?? 12)) });
  }

  // 회사 급여 이력 — SalaryCalculation 집계 (기존 방식 유지, 그룹 필터 적용)
  const { salaryCalcRepo } = getContainer();
  const result = await salaryCalcRepo.getHistory(auth.companyId, page, limit, payrollGroupId);

  const items = (result.items as Array<Record<string, unknown>>).map((item) => ({
    ...item,
    totalEmployees: item.employeeCount,
  }));

  return successResponse({ items, total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
