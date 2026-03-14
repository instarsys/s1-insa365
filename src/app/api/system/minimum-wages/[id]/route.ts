import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, notFoundResponse, noContentResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();

  const existing = await getContainer().minimumWageRepo.findById(id);
  if (!existing) return notFoundResponse('최저임금');

  const updated = await getContainer().minimumWageRepo.update(id, {
    ...(body.hourlyWage !== undefined && { hourlyWage: body.hourlyWage }),
    ...(body.monthlyWage !== undefined && { monthlyWage: body.monthlyWage }),
    ...(body.description !== undefined && { description: body.description }),
  });

  const { auditLogRepo } = getContainer();
  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'MinimumWage',
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: body as Record<string, unknown>,
  });

  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const existing = await getContainer().minimumWageRepo.findById(id);
  if (!existing) return notFoundResponse('최저임금');

  await getContainer().minimumWageRepo.delete(id);

  const { auditLogRepo } = getContainer();
  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'DELETE',
    entityType: 'MinimumWage',
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
  });

  return noContentResponse();
}

function createHandler(method: 'PUT' | 'DELETE') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const methods = { PUT: handlePut, DELETE: handleDelete };
    const wrapped = withRole('SYSTEM_ADMIN', methods[method]);
    return wrapped(request);
  };
}

export const PUT = createHandler('PUT') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createHandler('DELETE') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
