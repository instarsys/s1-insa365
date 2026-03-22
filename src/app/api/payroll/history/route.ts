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

  const { salaryCalcRepo } = getContainer();

  if (targetUserId) {
    // Per-employee history
    const result = await salaryCalcRepo.getEmployeeHistory(auth.companyId, targetUserId, page, limit);

    const mapped = result.items.map((item) => ({
      year: item.year,
      month: item.month,
      totalEmployees: 1,
      totalPay: Number(item.totalPay),
      totalDeduction: Number(item.totalDeduction),
      totalNetPay: Number(item.netPay),
      status: item.status,
      confirmedAt: item.confirmedAt,
      basePay: Number(item.basePay),
      fixedAllowances: Number(item.fixedAllowances),
      overtimePay: Number(item.overtimePay),
      nightPay: Number(item.nightPay),
      holidayPay: Number(item.holidayPay),
      variableAllowances: Number(item.variableAllowances),
      totalNonTaxable: Number(item.totalNonTaxable),
      nationalPension: Number(item.nationalPension),
      healthInsurance: Number(item.healthInsurance),
      longTermCare: Number(item.longTermCare),
      employmentInsurance: Number(item.employmentInsurance),
      incomeTax: Number(item.incomeTax),
      localIncomeTax: Number(item.localIncomeTax),
      netPay: Number(item.netPay),
    }));

    return successResponse({ items: mapped, total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) });
  }

  // Company-level history (grouped by year/month, optionally filtered by payrollGroupId)
  const result = await salaryCalcRepo.getHistory(auth.companyId, page, limit, payrollGroupId);

  return successResponse({ items: result.items, total: result.total, page: result.page, limit: result.limit, totalPages: Math.ceil(result.total / result.limit) });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
