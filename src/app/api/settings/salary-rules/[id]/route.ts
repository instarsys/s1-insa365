import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, notFoundResponse, noContentResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();

  const existing = await prisma.salaryRule.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });
  if (!existing) return notFoundResponse('급여 항목');

  const updated = await prisma.salaryRule.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.paymentType && { paymentType: body.paymentType }),
      ...(body.paymentCycle && { paymentCycle: body.paymentCycle }),
      ...(body.defaultAmount !== undefined && { defaultAmount: body.defaultAmount }),
      ...(body.isOrdinaryWage !== undefined && { isOrdinaryWage: body.isOrdinaryWage }),
      ...(body.isTaxExempt !== undefined && { isTaxExempt: body.isTaxExempt }),
      ...(body.taxExemptCode !== undefined && { taxExemptCode: body.taxExemptCode }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.formula !== undefined && { formula: body.formula }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'SalaryRule',
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: body as Record<string, unknown>,
  });

  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const existing = await prisma.salaryRule.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });
  if (!existing) return notFoundResponse('급여 항목');

  await prisma.salaryRule.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'DELETE',
    entityType: 'SalaryRule',
    entityId: id,
    before: { code: existing.code, name: existing.name } as Record<string, string>,
  });

  return noContentResponse();
}

function createHandler(method: 'PUT' | 'DELETE') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const methods = { PUT: handlePut, DELETE: handleDelete };
    const wrapped = withRole('COMPANY_ADMIN', methods[method]);
    return wrapped(request);
  };
}

export const PUT = createHandler('PUT') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createHandler('DELETE') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
