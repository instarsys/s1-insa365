import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { getPayrollDetailUseCase } = getContainer();
  const result = await getPayrollDetailUseCase.execute(auth.companyId, id);

  if (!result) return notFoundResponse('급여 계산');

  return successResponse(result);
}

function createRoute() {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withAuth(handler);
    return wrapped(request);
  };
}

export const GET = createRoute() as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
