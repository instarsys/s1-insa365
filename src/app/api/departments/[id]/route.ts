import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse, noContentResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();
  const { departmentRepo } = getContainer();

  const existing = await departmentRepo.findById(auth.companyId, id);
  if (!existing) return notFoundResponse('부서');

  if (body.name && body.name !== existing.name) {
    const dup = await departmentRepo.findByNameExcept(auth.companyId, body.name, id);
    if (dup) return errorResponse('이미 존재하는 부서명입니다.', 409);
  }

  const updated = await departmentRepo.update(auth.companyId, id, {
    ...(body.name && { name: body.name }),
    ...(body.code !== undefined && { code: body.code }),
    ...(body.parentId !== undefined && { parentId: body.parentId }),
    ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
  });

  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const { departmentRepo } = getContainer();

  const existing = await departmentRepo.findById(auth.companyId, id);
  if (!existing) return notFoundResponse('부서');

  const { userRepo } = getContainer();
  const userCount = await userRepo.countByDepartment(auth.companyId, id);
  if (userCount > 0) return errorResponse('소속 직원이 있는 부서는 삭제할 수 없습니다.', 400);

  await departmentRepo.softDelete(auth.companyId, id);

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
