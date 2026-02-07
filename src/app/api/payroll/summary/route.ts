import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const calculations = await prisma.salaryCalculation.findMany({
    where: {
      companyId: auth.companyId,
      year,
      month,
      deletedAt: null,
      status: { not: 'SKIPPED' },
    },
  });

  const summary = {
    year,
    month,
    employeeCount: calculations.length,
    totalBasePay: calculations.reduce((s, c) => s + Number(c.basePay), 0),
    totalAllowances: calculations.reduce((s, c) => s + Number(c.fixedAllowances) + Number(c.variableAllowances), 0),
    totalOvertimePay: calculations.reduce((s, c) => s + Number(c.overtimePay) + Number(c.nightPay) + Number(c.nightOvertimePay) + Number(c.holidayPay) + Number(c.holidayOvertimePay) + Number(c.holidayNightPay) + Number(c.holidayNightOvertimePay), 0),
    totalPay: calculations.reduce((s, c) => s + Number(c.totalPay), 0),
    totalNonTaxable: calculations.reduce((s, c) => s + Number(c.totalNonTaxable), 0),
    totalNationalPension: calculations.reduce((s, c) => s + Number(c.nationalPension), 0),
    totalHealthInsurance: calculations.reduce((s, c) => s + Number(c.healthInsurance), 0),
    totalLongTermCare: calculations.reduce((s, c) => s + Number(c.longTermCare), 0),
    totalEmploymentInsurance: calculations.reduce((s, c) => s + Number(c.employmentInsurance), 0),
    totalIncomeTax: calculations.reduce((s, c) => s + Number(c.incomeTax), 0),
    totalLocalIncomeTax: calculations.reduce((s, c) => s + Number(c.localIncomeTax), 0),
    totalDeduction: calculations.reduce((s, c) => s + Number(c.totalDeduction), 0),
    totalNetPay: calculations.reduce((s, c) => s + Number(c.netPay), 0),
    status: calculations.length > 0 ? calculations[0].status : null,
  };

  return successResponse(summary);
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
