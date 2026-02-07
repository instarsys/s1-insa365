import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse, noContentResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();

  const existing = await prisma.position.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });
  if (!existing) return notFoundResponse('직위');

  if (body.name && body.name !== existing.name) {
    const dup = await prisma.position.findFirst({
      where: { companyId: auth.companyId, name: body.name, deletedAt: null, NOT: { id } },
    });
    if (dup) return errorResponse('이미 존재하는 직위명입니다.', 409);
  }

  const updated = await prisma.position.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.level !== undefined && { level: body.level }),
    },
  });

  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const existing = await prisma.position.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });
  if (!existing) return notFoundResponse('직위');

  const userCount = await prisma.user.count({
    where: { positionId: id, companyId: auth.companyId, deletedAt: null },
  });
  if (userCount > 0) return errorResponse('소속 직원이 있는 직위는 삭제할 수 없습니다.', 400);

  await prisma.position.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return noContentResponse();
}

function createHandler(method: 'PUT' | 'DELETE') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const methods = { PUT: handlePut, DELETE: handleDelete };
    const wrapped = withAuth(methods[method]);
    return wrapped(request, routeContext);
  };
}

export const PUT = createHandler('PUT') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createHandler('DELETE') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
