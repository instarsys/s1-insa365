import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { salaryCalcRepo } = getContainer();

  // Current month calculations
  const calculations = await salaryCalcRepo.findByPeriod(auth.companyId, year, month);
  const active = calculations.filter((c) => c.status !== 'SKIPPED');

  // Previous month for comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevCalculations = await salaryCalcRepo.findByPeriod(auth.companyId, prevYear, prevMonth);
  const prevActive = prevCalculations.filter((c) => c.status !== 'SKIPPED');

  const totalNetPay = active.reduce((s, c) => s + Number(c.netPay), 0);
  const totalPay = active.reduce((s, c) => s + Number(c.totalPay), 0);
  const totalDeduction = active.reduce((s, c) => s + Number(c.totalDeduction), 0);
  const previousMonthNetPay = prevActive.reduce((s, c) => s + Number(c.netPay), 0);
  const changePercent = previousMonthNetPay > 0
    ? Math.round(((totalNetPay - previousMonthNetPay) / previousMonthNetPay) * 10000) / 100
    : undefined;

  // Warnings
  const warnings: string[] = [];
  const minWageWarnings = active.filter((c) => c.minimumWageWarning);
  if (minWageWarnings.length > 0) {
    warnings.push(`최저임금 미달 경고: ${minWageWarnings.length}명`);
  }
  const failedCalcs = active.filter((c) => c.status === 'FAILED');
  if (failedCalcs.length > 0) {
    warnings.push(`계산 오류: ${failedCalcs.length}명`);
  }

  // By department aggregation
  const deptMap = new Map<string, { count: number; totalPay: number; totalNetPay: number }>();
  for (const calc of active) {
    const deptName = calc.user?.department?.name ?? '미배정';
    const entry = deptMap.get(deptName) ?? { count: 0, totalPay: 0, totalNetPay: 0 };
    entry.count += 1;
    entry.totalPay += Number(calc.totalPay);
    entry.totalNetPay += Number(calc.netPay);
    deptMap.set(deptName, entry);
  }
  const byDepartment = Array.from(deptMap.entries()).map(([departmentName, d]) => ({
    departmentName,
    employeeCount: d.count,
    totalPay: d.totalPay,
    totalNetPay: d.totalNetPay,
  }));

  const summary = {
    year,
    month,
    totalEmployees: active.length,
    totalBasePay: active.reduce((s, c) => s + Number(c.basePay), 0),
    totalAllowances: active.reduce((s, c) => s + Number(c.fixedAllowances) + Number(c.variableAllowances), 0),
    totalOvertimePay: active.reduce((s, c) => s + Number(c.overtimePay) + Number(c.nightPay) + Number(c.nightOvertimePay) + Number(c.holidayPay) + Number(c.holidayOvertimePay) + Number(c.holidayNightPay) + Number(c.holidayNightOvertimePay), 0),
    totalPay,
    totalNonTaxable: active.reduce((s, c) => s + Number(c.totalNonTaxable), 0),
    totalNationalPension: active.reduce((s, c) => s + Number(c.nationalPension), 0),
    totalHealthInsurance: active.reduce((s, c) => s + Number(c.healthInsurance), 0),
    totalLongTermCare: active.reduce((s, c) => s + Number(c.longTermCare), 0),
    totalEmploymentInsurance: active.reduce((s, c) => s + Number(c.employmentInsurance), 0),
    totalIncomeTax: active.reduce((s, c) => s + Number(c.incomeTax), 0),
    totalLocalIncomeTax: active.reduce((s, c) => s + Number(c.localIncomeTax), 0),
    totalDeduction,
    totalNetPay,
    previousMonthNetPay: prevActive.length > 0 ? previousMonthNetPay : undefined,
    changePercent,
    warnings,
    byDepartment,
    status: active.length > 0 ? active[0].status : null,
  };

  return successResponse(summary);
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
