import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
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
      status: { in: ['CONFIRMED', 'PAID'] },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          department: { select: { name: true } },
          position: { select: { name: true } },
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const totals = {
    totalPay: calculations.reduce((s, c) => s + Number(c.totalPay), 0),
    totalDeduction: calculations.reduce((s, c) => s + Number(c.totalDeduction), 0),
    totalNetPay: calculations.reduce((s, c) => s + Number(c.netPay), 0),
    nationalPension: calculations.reduce((s, c) => s + Number(c.nationalPension), 0),
    healthInsurance: calculations.reduce((s, c) => s + Number(c.healthInsurance), 0),
    longTermCare: calculations.reduce((s, c) => s + Number(c.longTermCare), 0),
    employmentInsurance: calculations.reduce((s, c) => s + Number(c.employmentInsurance), 0),
    incomeTax: calculations.reduce((s, c) => s + Number(c.incomeTax), 0),
    localIncomeTax: calculations.reduce((s, c) => s + Number(c.localIncomeTax), 0),
  };

  return successResponse({
    year,
    month,
    employeeCount: calculations.length,
    items: calculations,
    totals,
  });
}

export const GET = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
