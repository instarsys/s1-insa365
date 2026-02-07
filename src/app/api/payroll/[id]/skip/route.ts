import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const { reason } = await request.json();

  const calc = await prisma.salaryCalculation.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });

  if (!calc) return notFoundResponse('급여 계산');
  if (calc.status !== 'DRAFT') return errorResponse('임시 상태의 급여만 건너뛸 수 있습니다.', 400);

  const updated = await prisma.salaryCalculation.update({
    where: { id },
    data: {
      status: 'SKIPPED',
      skipReason: reason ?? null,
    },
  });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'SalaryCalculation',
    entityId: id,
    after: { status: 'SKIPPED', reason } as Record<string, unknown>,
  });

  return successResponse(updated);
}

function createRoute() {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withRole('COMPANY_ADMIN', handler);
    return wrapped(request);
  };
}

export const POST = createRoute() as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
