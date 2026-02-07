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

  const existing = await prisma.legalParameter.findUnique({ where: { id } });
  if (!existing) return notFoundResponse('법정 파라미터');

  const updated = await prisma.legalParameter.update({
    where: { id },
    data: {
      ...(body.value !== undefined && { value: String(body.value) }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.unit !== undefined && { unit: body.unit }),
    },
  });

  await auditLogService.log({
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

  const existing = await prisma.legalParameter.findUnique({ where: { id } });
  if (!existing) return notFoundResponse('법정 파라미터');

  await prisma.legalParameter.delete({ where: { id } });

  await auditLogService.log({
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
