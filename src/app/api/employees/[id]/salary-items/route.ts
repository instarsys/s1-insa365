import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const user = await prisma.user.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
    select: { id: true },
  });
  if (!user) return notFoundResponse('직원');

  const items = await prisma.employeeSalaryItem.findMany({
    where: { userId: id, companyId: auth.companyId, deletedAt: null },
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
  });

  return successResponse({ items });
}

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();
  const { items } = body as { items: Array<{ id: string; amount?: number; isActive?: boolean; isOrdinaryWage?: boolean; isTaxExempt?: boolean }> };

  if (!items || !Array.isArray(items)) {
    return errorResponse('급여 항목 데이터가 필요합니다.', 400);
  }

  const user = await prisma.user.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
    select: { id: true },
  });
  if (!user) return notFoundResponse('직원');

  await prisma.$transaction(
    items.map((item) =>
      prisma.employeeSalaryItem.update({
        where: { id: item.id },
        data: {
          ...(item.amount !== undefined && { amount: item.amount }),
          ...(item.isActive !== undefined && { isActive: item.isActive }),
          ...(item.isOrdinaryWage !== undefined && { isOrdinaryWage: item.isOrdinaryWage }),
          ...(item.isTaxExempt !== undefined && { isTaxExempt: item.isTaxExempt }),
        },
      }),
    ),
  );

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'EmployeeSalaryItem',
    entityId: id,
    after: { updatedItems: items.length },
  });

  const updated = await prisma.employeeSalaryItem.findMany({
    where: { userId: id, companyId: auth.companyId, deletedAt: null },
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
  });

  return successResponse({ items: updated });
}

function createHandler(method: 'GET' | 'PUT') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const methods = { GET: handleGet, PUT: handlePut };
    const wrapped = withAuth(methods[method]);
    return wrapped(request, routeContext);
  };
}

export const GET = createHandler('GET') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const PUT = createHandler('PUT') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
