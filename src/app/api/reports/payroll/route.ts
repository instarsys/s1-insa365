import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const startYear = parseInt(url.searchParams.get('startYear') ?? '', 10);
  const startMonth = parseInt(url.searchParams.get('startMonth') ?? '', 10);
  const endYear = parseInt(url.searchParams.get('endYear') ?? '', 10);
  const endMonth = parseInt(url.searchParams.get('endMonth') ?? '', 10);

  if ([startYear, startMonth, endYear, endMonth].some(isNaN)) {
    return errorResponse('시작/종료 연월을 지정해주세요.', 400);
  }

  // Build list of year-month pairs in range
  const months: { year: number; month: number }[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }

  const calculations = await prisma.salaryCalculation.findMany({
    where: {
      companyId: auth.companyId,
      deletedAt: null,
      status: { in: ['CONFIRMED', 'PAID'] },
      OR: months.map((ym) => ({ year: ym.year, month: ym.month })),
    },
    select: {
      year: true,
      month: true,
      totalPay: true,
      netPay: true,
    },
  });

  const items = months.map((ym) => {
    const monthCalcs = calculations.filter((c) => c.year === ym.year && c.month === ym.month);
    return {
      year: ym.year,
      month: ym.month,
      totalEmployees: monthCalcs.length,
      totalPay: monthCalcs.reduce((s, c) => s + Number(c.totalPay), 0),
      totalNetPay: monthCalcs.reduce((s, c) => s + Number(c.netPay), 0),
    };
  });

  return successResponse({ items });
}

export const GET = withRole('MANAGER', handler) as (request: NextRequest) => Promise<NextResponse>;
