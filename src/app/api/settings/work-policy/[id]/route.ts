import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse, noContentResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();

  const existing = await prisma.workPolicy.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });
  if (!existing) return notFoundResponse('근무 정책');

  if (body.isDefault) {
    await prisma.workPolicy.updateMany({
      where: { companyId: auth.companyId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.workPolicy.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.startTime && { startTime: body.startTime }),
      ...(body.endTime && { endTime: body.endTime }),
      ...(body.breakMinutes !== undefined && { breakMinutes: body.breakMinutes }),
      ...(body.workDays && { workDays: body.workDays }),
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
    },
  });

  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const existing = await prisma.workPolicy.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });
  if (!existing) return notFoundResponse('근무 정책');

  if (existing.isDefault) return errorResponse('기본 근무 정책은 삭제할 수 없습니다.', 400);

  const userCount = await prisma.user.count({ where: { workPolicyId: id, companyId: auth.companyId, deletedAt: null } });
  if (userCount > 0) return errorResponse('소속 직원이 있는 근무 정책은 삭제할 수 없습니다.', 400);

  await prisma.workPolicy.update({
    where: { id },
    data: { deletedAt: new Date() },
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
