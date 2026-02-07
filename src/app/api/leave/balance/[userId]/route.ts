import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ userId: string }> };

async function handler(request: NextRequest, auth: AuthContext) {
  const { userId } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const { year, totalDays } = await request.json();

  if (!year || totalDays === undefined) {
    return errorResponse('연도와 총 일수를 입력해주세요.', 400);
  }

  const balance = await prisma.leaveBalance.upsert({
    where: {
      companyId_userId_year: {
        companyId: auth.companyId,
        userId,
        year,
      },
    },
    update: {
      totalDays,
      remainingDays: totalDays - Number((await prisma.leaveBalance.findFirst({
        where: { companyId: auth.companyId, userId, year },
        select: { usedDays: true },
      }))?.usedDays ?? 0),
    },
    create: {
      companyId: auth.companyId,
      userId,
      year,
      totalDays,
      usedDays: 0,
      remainingDays: totalDays,
    },
  });

  return successResponse(balance);
}

function createRoute() {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withRole('MANAGER', handler);
    return wrapped(request);
  };
}

export const PUT = createRoute() as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
