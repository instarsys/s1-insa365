import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);
  const payrollGroupId = url.searchParams.get('payrollGroupId') || undefined;

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { salaryCalcRepo } = getContainer();

  const allCalculations = await salaryCalcRepo.findByPeriod(auth.companyId, year, month);
  const calculations = payrollGroupId
    ? allCalculations.filter((c) => c.payrollGroupId === payrollGroupId)
    : allCalculations;

  const items = calculations.map((calc) => {
    // SalaryCalculation 필드에서 항목별 items 배열 생성
    const payItems: { code: string; name: string; amount: number; type: string }[] = [];
    if (Number(calc.basePay) > 0) payItems.push({ code: 'A01', name: '기본급', amount: Number(calc.basePay), type: 'ALLOWANCE' });
    if (Number(calc.fixedAllowances) > 0) payItems.push({ code: 'A02', name: '고정수당', amount: Number(calc.fixedAllowances), type: 'ALLOWANCE' });
    if (Number(calc.overtimePay) > 0) payItems.push({ code: 'A08', name: '연장수당', amount: Number(calc.overtimePay), type: 'ALLOWANCE' });
    if (Number(calc.nightPay) > 0) payItems.push({ code: 'A09', name: '야간수당', amount: Number(calc.nightPay), type: 'ALLOWANCE' });
    if (Number(calc.holidayPay) > 0) payItems.push({ code: 'A10', name: '휴일수당', amount: Number(calc.holidayPay), type: 'ALLOWANCE' });
    if (Number(calc.variableAllowances) > 0) payItems.push({ code: 'A11', name: '변동수당', amount: Number(calc.variableAllowances), type: 'ALLOWANCE' });
    if (Number(calc.nationalPension) > 0) payItems.push({ code: 'D01', name: '국민연금', amount: Number(calc.nationalPension), type: 'DEDUCTION' });
    if (Number(calc.healthInsurance) > 0) payItems.push({ code: 'D02', name: '건강보험', amount: Number(calc.healthInsurance), type: 'DEDUCTION' });
    if (Number(calc.longTermCare) > 0) payItems.push({ code: 'D03', name: '장기요양', amount: Number(calc.longTermCare), type: 'DEDUCTION' });
    if (Number(calc.employmentInsurance) > 0) payItems.push({ code: 'D04', name: '고용보험', amount: Number(calc.employmentInsurance), type: 'DEDUCTION' });
    if (Number(calc.incomeTax) > 0) payItems.push({ code: 'D05', name: '소득세', amount: Number(calc.incomeTax), type: 'DEDUCTION' });
    if (Number(calc.localIncomeTax) > 0) payItems.push({ code: 'D06', name: '지방소득세', amount: Number(calc.localIncomeTax), type: 'DEDUCTION' });

    return {
      employeeId: calc.userId,
      employeeName: calc.user?.name ?? '',
      employeeNumber: calc.user?.employeeNumber ?? '',
      departmentName: calc.user?.department?.name,
      basePay: Number(calc.basePay),
      items: payItems,
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
      attendanceDeductions: Number(calc.attendanceDeductions),
      calculationId: calc.id,
    };
  });

  return successResponse({ year, month, items });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
