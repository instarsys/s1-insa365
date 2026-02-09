import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { salaryCalcRepo } = getContainer();

  const calculations = await salaryCalcRepo.findByPeriod(auth.companyId, year, month);
  const confirmedCalcs = calculations.filter((c) => c.status === 'CONFIRMED' || c.status === 'PAID');

  const totals = {
    totalPay: confirmedCalcs.reduce((s, c) => s + Number(c.totalPay), 0),
    totalDeduction: confirmedCalcs.reduce((s, c) => s + Number(c.totalDeduction), 0),
    totalNetPay: confirmedCalcs.reduce((s, c) => s + Number(c.netPay), 0),
    nationalPension: confirmedCalcs.reduce((s, c) => s + Number(c.nationalPension), 0),
    healthInsurance: confirmedCalcs.reduce((s, c) => s + Number(c.healthInsurance), 0),
    longTermCare: confirmedCalcs.reduce((s, c) => s + Number(c.longTermCare), 0),
    employmentInsurance: confirmedCalcs.reduce((s, c) => s + Number(c.employmentInsurance), 0),
    incomeTax: confirmedCalcs.reduce((s, c) => s + Number(c.incomeTax), 0),
    localIncomeTax: confirmedCalcs.reduce((s, c) => s + Number(c.localIncomeTax), 0),
  };

  return successResponse({
    year,
    month,
    employeeCount: confirmedCalcs.length,
    items: confirmedCalcs,
    totals,
  });
}

export const GET = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
