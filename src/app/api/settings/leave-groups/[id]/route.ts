import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/persistence/prisma/client';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse, validateBody } from '@/presentation/api/helpers';
import { createLeaveGroupSchema } from '@/presentation/api/schemas';

type RouteContext = { params: Promise<{ id: string }> };

async function putHandler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  try {
    const group = await prisma.leaveGroup.findFirst({
      where: { id, companyId: auth.companyId, deletedAt: null },
    });
    if (!group) return notFoundResponse('휴가 그룹');

    const body = await request.json();
    const validation = validateBody(createLeaveGroupSchema.partial(), body);
    if (!validation.success) return validation.response;

    if (group.isSystem && validation.data.name && validation.data.name !== group.name) {
      return errorResponse('시스템 그룹의 이름은 변경할 수 없습니다.', 400);
    }

    const updated = await prisma.leaveGroup.update({
      where: { id },
      data: {
        ...(validation.data.name !== undefined && { name: validation.data.name }),
        ...(validation.data.allowOveruse !== undefined && { allowOveruse: validation.data.allowOveruse }),
        ...(validation.data.description !== undefined && { description: validation.data.description }),
        ...(validation.data.sortOrder !== undefined && { sortOrder: validation.data.sortOrder }),
      },
    });

    return successResponse(updated);
  } catch {
    return errorResponse('휴가 그룹 수정 중 오류가 발생했습니다.', 500);
  }
}

async function deleteHandler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const group = await prisma.leaveGroup.findFirst({
    where: { id, companyId: auth.companyId, deletedAt: null },
  });
  if (!group) return notFoundResponse('휴가 그룹');
  if (group.isSystem) return errorResponse('시스템 그룹은 삭제할 수 없습니다.', 400);

  await prisma.leaveGroup.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return new NextResponse(null, { status: 204 });
}

function createRoute(handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withRole('COMPANY_ADMIN', handler);
    return wrapped(request);
  };
}

export const PUT = createRoute(putHandler) as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createRoute(deleteHandler) as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
