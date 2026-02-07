import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const calc = await prisma.salaryCalculation.findFirst({
    where: {
      id,
      companyId: auth.companyId,
      deletedAt: null,
      ...(auth.role === 'EMPLOYEE' && { userId: auth.userId }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          department: { select: { name: true } },
          position: { select: { name: true } },
          joinDate: true,
        },
      },
    },
  });

  if (!calc) return notFoundResponse('급여명세서');

  const company = await prisma.company.findUnique({
    where: { id: auth.companyId },
    select: { name: true, businessNumber: true, representativeName: true },
  });

  await auditLogService.log({
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
