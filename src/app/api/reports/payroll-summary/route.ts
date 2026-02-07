import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, parseSearchParams } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year } = parseSearchParams(url);
  const targetYear = year ?? new Date().getFullYear();

  const monthlies = await prisma.payrollMonthly.findMany({
    where: { companyId: auth.companyId, year: targetYear },
  });

  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthData = monthlies.filter((m) => m.month === month);
    return {
      month,
      employeeCount: monthData.length,
      totalPay: monthData.reduce((s, m) => s + Number(m.totalPay), 0),
      totalDeduction: monthData.reduce(
        (s, m) =>
          s + Number(m.nationalPension) + Number(m.healthInsurance) + Number(m.longTermCare) + Number(m.employmentInsurance) + Number(m.incomeTax) + Number(m.localIncomeTax),
        0,
      ),
      totalNetPay: monthData.reduce((s, m) => s + Number(m.netPay), 0),
    };
  });

  return successResponse({ year: targetYear, months: monthlyTotals });
}

export const GET = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
