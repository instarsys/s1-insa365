import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);
  const payrollGroupId = url.searchParams.get('payrollGroupId') || undefined;

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { salaryCalcRepo } = getContainer();

  const allCalculations = await salaryCalcRepo.findByPeriod(auth.companyId, year, month);
  const filtered = payrollGroupId
    ? allCalculations.filter((c) => c.payrollGroupId === payrollGroupId)
    : allCalculations;
  const confirmedCalcs = filtered.filter((c) => c.status === 'CONFIRMED' || c.status === 'PAID');

  // 페이지가 기대하는 employees 형식으로 변환
  const employees = confirmedCalcs.map((c) => {
    const items: { code: string; name: string; amount: number; type: string }[] = [];

    // 지급 항목 (ALLOWANCE)
    if (Number(c.basePay) > 0) items.push({ code: 'A01', name: '기본급', amount: Number(c.basePay), type: 'ALLOWANCE' });
    if (Number(c.fixedAllowances) > 0) items.push({ code: 'A02', name: '고정수당', amount: Number(c.fixedAllowances), type: 'ALLOWANCE' });
    if (Number(c.overtimePay) > 0) items.push({ code: 'A08', name: '연장수당', amount: Number(c.overtimePay), type: 'ALLOWANCE' });
    if (Number(c.nightPay) > 0) items.push({ code: 'A09', name: '야간수당', amount: Number(c.nightPay), type: 'ALLOWANCE' });
    if (Number(c.holidayPay) > 0) items.push({ code: 'A10', name: '휴일수당', amount: Number(c.holidayPay), type: 'ALLOWANCE' });
    if (Number(c.variableAllowances) > 0) items.push({ code: 'A11', name: '변동수당', amount: Number(c.variableAllowances), type: 'ALLOWANCE' });

    // 공제 항목 (DEDUCTION)
    if (Number(c.nationalPension) > 0) items.push({ code: 'D01', name: '국민연금', amount: Number(c.nationalPension), type: 'DEDUCTION' });
    if (Number(c.healthInsurance) > 0) items.push({ code: 'D02', name: '건강보험', amount: Number(c.healthInsurance), type: 'DEDUCTION' });
    if (Number(c.longTermCare) > 0) items.push({ code: 'D03', name: '장기요양', amount: Number(c.longTermCare), type: 'DEDUCTION' });
    if (Number(c.employmentInsurance) > 0) items.push({ code: 'D04', name: '고용보험', amount: Number(c.employmentInsurance), type: 'DEDUCTION' });
    if (Number(c.incomeTax) > 0) items.push({ code: 'D05', name: '소득세', amount: Number(c.incomeTax), type: 'DEDUCTION' });
    if (Number(c.localIncomeTax) > 0) items.push({ code: 'D06', name: '지방소득세', amount: Number(c.localIncomeTax), type: 'DEDUCTION' });

    return {
      employeeNumber: c.user?.employeeNumber ?? '',
      employeeName: c.user?.name ?? '',
      departmentName: c.user?.department?.name ?? '',
      items,
      totalPay: Number(c.totalPay),
      totalDeduction: Number(c.totalDeduction),
      netPay: Number(c.netPay),
    };
  });

  return successResponse({
    year,
    month,
    employeeCount: confirmedCalcs.length,
    employees,
  });
}

export const GET = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
