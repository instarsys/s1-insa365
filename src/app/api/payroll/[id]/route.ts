import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();

  const calc = await prisma.salaryCalculation.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });

  if (!calc) return notFoundResponse('급여 계산');
  if (calc.status !== 'DRAFT') return errorResponse('확정된 급여는 수정할 수 없습니다.', 400);

  const allowedFields = [
    'basePay', 'fixedAllowances', 'variableAllowances', 'attendanceDeductions',
    'overtimePay', 'nightPay', 'nightOvertimePay', 'holidayPay', 'holidayOvertimePay',
    'holidayNightPay', 'holidayNightOvertimePay', 'otherDeductions',
  ] as const;

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }

  // Recalculate totals if pay items changed
  const updated = await prisma.salaryCalculation.update({
    where: { id },
    data: updateData,
  });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'SalaryCalculation',
    entityId: id,
    before: calc as unknown as Record<string, unknown>,
    after: updateData,
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

export const PUT = createRoute() as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
