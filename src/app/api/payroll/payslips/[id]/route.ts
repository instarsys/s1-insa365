import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';

import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { salaryCalcRepo, companyRepo, auditLogRepo } = getContainer();

  const calc = await salaryCalcRepo.findByIdWithDetails(
    auth.companyId,
    id,
    auth.role === 'EMPLOYEE' ? auth.userId : undefined,
  );

  if (!calc) return notFoundResponse('급여명세서');

  const company = await companyRepo.findById(auth.companyId);

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'READ',
    entityType: 'SalaryCalculation',
    entityId: id,
  });

  return successResponse({ payslip: calc, company });
}

function createRoute() {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withAuth(handler);
    return wrapped(request, routeContext);
  };
}

export const GET = createRoute() as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
