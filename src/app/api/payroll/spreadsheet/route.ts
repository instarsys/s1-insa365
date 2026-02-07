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
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          department: { select: { name: true } },
          position: { select: { name: true } },
          employeeSalaryItems: {
            where: { deletedAt: null, isActive: true },
            orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
          },
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  return successResponse({ year, month, items: calculations });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
