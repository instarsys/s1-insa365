import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, notFoundResponse, noContentResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();

  const existing = await getContainer().legalParameterRepo.findById(id);
  if (!existing) return notFoundResponse('법정 파라미터');

  const updated = await getContainer().legalParameterRepo.update(id, {
    ...(body.value !== undefined && { value: String(body.value) }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.unit !== undefined && { unit: body.unit }),
  });

  const { auditLogRepo } = getContainer();
  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'LegalParameter',
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: body as Record<string, unknown>,
  });

  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const existing = await getContainer().legalParameterRepo.findById(id);
  if (!existing) return notFoundResponse('법정 파라미터');

  await getContainer().legalParameterRepo.delete(id);

  const { auditLogRepo } = getContainer();
  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'DELETE',
    entityType: 'LegalParameter',
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
