import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

type RouteContext = { params: Promise<{ userId: string }> };

async function handler(request: NextRequest, auth: AuthContext) {
  const { userId } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const { year, totalDays } = await request.json();

  if (!year || totalDays === undefined) {
    return errorResponse('연도와 총 일수를 입력해주세요.', 400);
  }

  const { leaveBalanceRepo } = getContainer();

  const balance = await leaveBalanceRepo.upsertTotalDays(auth.companyId, userId, year, totalDays);

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
