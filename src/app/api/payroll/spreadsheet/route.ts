import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { salaryCalcRepo } = getContainer();

  const calculations = await salaryCalcRepo.findByPeriod(auth.companyId, year, month);

  const items = calculations.map((calc) => ({
    employeeId: calc.userId,
    employeeName: calc.user?.name ?? '',
    employeeNumber: calc.user?.employeeNumber ?? '',
    departmentName: calc.user?.department?.name,
    basePay: Number(calc.basePay),
    items: (calc.user as { employeeSalaryItems?: { code: string; name: string; amount: unknown; type: string }[] })?.employeeSalaryItems?.map((item) => ({
      code: item.code,
      name: item.name,
      amount: Number(item.amount),
      type: item.type,
    })) ?? [],
    totalPay: Number(calc.totalPay),
    totalDeduction: Number(calc.totalDeduction),
    netPay: Number(calc.netPay),
    status: calc.status,
    isSkipped: calc.status === 'SKIPPED',
    skipReason: (calc as { skipReason?: string }).skipReason ?? undefined,
    fixedAllowances: Number(calc.fixedAllowances),
    variableAllowances: Number(calc.variableAllowances),
    overtimePay: Number(calc.overtimePay),
    nightPay: Number(calc.nightPay),
    holidayPay: Number(calc.holidayPay),
    nationalPension: Number(calc.nationalPension),
    healthInsurance: Number(calc.healthInsurance),
    longTermCare: Number(calc.longTermCare),
    employmentInsurance: Number(calc.employmentInsurance),
    incomeTax: Number(calc.incomeTax),
    localIncomeTax: Number(calc.localIncomeTax),
    calculationId: calc.id,
  }));

  return successResponse({ year, month, items });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
