import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  // Current month calculations with user/department info
  const calculations = await prisma.salaryCalculation.findMany({
    where: {
      companyId: auth.companyId,
      year,
      month,
      deletedAt: null,
      status: { not: 'SKIPPED' },
    },
    include: {
      user: {
        select: {
          department: { select: { name: true } },
        },
      },
    },
  });

  // Previous month calculations for comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevCalculations = await prisma.salaryCalculation.findMany({
    where: {
      companyId: auth.companyId,
      year: prevYear,
      month: prevMonth,
      deletedAt: null,
      status: { not: 'SKIPPED' },
    },
  });

  const totalNetPay = calculations.reduce((s, c) => s + Number(c.netPay), 0);
  const totalPay = calculations.reduce((s, c) => s + Number(c.totalPay), 0);
  const totalDeduction = calculations.reduce((s, c) => s + Number(c.totalDeduction), 0);
  const previousMonthNetPay = prevCalculations.reduce((s, c) => s + Number(c.netPay), 0);
  const changePercent = previousMonthNetPay > 0
    ? Math.round(((totalNetPay - previousMonthNetPay) / previousMonthNetPay) * 10000) / 100
    : undefined;

  // Warnings
  const warnings: string[] = [];
  const minWageWarnings = calculations.filter((c) => c.minimumWageWarning);
  if (minWageWarnings.length > 0) {
    warnings.push(`최저임금 미달 경고: ${minWageWarnings.length}명`);
  }
  const failedCalcs = calculations.filter((c) => c.status === 'FAILED');
  if (failedCalcs.length > 0) {
    warnings.push(`계산 오류: ${failedCalcs.length}명`);
  }

  // By department aggregation
  const deptMap = new Map<string, { count: number; totalPay: number; totalNetPay: number }>();
  for (const calc of calculations) {
    const deptName = calc.user.department?.name ?? '미배정';
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
    totalEmployees: calculations.length,
    totalBasePay: calculations.reduce((s, c) => s + Number(c.basePay), 0),
    totalAllowances: calculations.reduce((s, c) => s + Number(c.fixedAllowances) + Number(c.variableAllowances), 0),
    totalOvertimePay: calculations.reduce((s, c) => s + Number(c.overtimePay) + Number(c.nightPay) + Number(c.nightOvertimePay) + Number(c.holidayPay) + Number(c.holidayOvertimePay) + Number(c.holidayNightPay) + Number(c.holidayNightOvertimePay), 0),
    totalPay,
    totalNonTaxable: calculations.reduce((s, c) => s + Number(c.totalNonTaxable), 0),
    totalNationalPension: calculations.reduce((s, c) => s + Number(c.nationalPension), 0),
    totalHealthInsurance: calculations.reduce((s, c) => s + Number(c.healthInsurance), 0),
    totalLongTermCare: calculations.reduce((s, c) => s + Number(c.longTermCare), 0),
    totalEmploymentInsurance: calculations.reduce((s, c) => s + Number(c.employmentInsurance), 0),
    totalIncomeTax: calculations.reduce((s, c) => s + Number(c.incomeTax), 0),
    totalLocalIncomeTax: calculations.reduce((s, c) => s + Number(c.localIncomeTax), 0),
    totalDeduction,
    totalNetPay,
    previousMonthNetPay: prevCalculations.length > 0 ? previousMonthNetPay : undefined,
    changePercent,
    warnings,
    byDepartment,
    status: calculations.length > 0 ? calculations[0].status : null,
  };

  return successResponse(summary);
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
