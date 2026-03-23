import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse, noContentResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const { crudWorkLocationUseCase } = getContainer();
  const location = await crudWorkLocationUseCase.getById(auth.companyId, id);
  if (!location) return notFoundResponse('근무지');
  return successResponse(location);
}

async function handlePut(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'COMPANY_ADMIN' && auth.role !== 'SYSTEM_ADMIN') {
    return errorResponse('권한이 없습니다.', 403);
  }

  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();
  const { crudWorkLocationUseCase } = getContainer();
  const updated = await crudWorkLocationUseCase.update(auth.companyId, id, body);
  if (!updated) return notFoundResponse('근무지');
  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  if (auth.role !== 'COMPANY_ADMIN' && auth.role !== 'SYSTEM_ADMIN') {
    return errorResponse('권한이 없습니다.', 403);
  }

  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const { crudWorkLocationUseCase, workLocationRepo } = getContainer();

  // 기본 근무지 삭제 보호
  const existing = await workLocationRepo.findById(auth.companyId, id);
  if (!existing) return notFoundResponse('근무지');
  if (existing.isDefault) return errorResponse('기본 근무지는 삭제할 수 없습니다.', 400);

  await crudWorkLocationUseCase.delete(auth.companyId, id);
  return noContentResponse();
}

function createHandler(method: 'GET' | 'PUT' | 'DELETE') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const methods = { GET: handleGet, PUT: handlePut, DELETE: handleDelete };
    const wrapped = withAuth(methods[method]);
    return wrapped(request, routeContext);
  };
}

export const GET = createHandler('GET') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const PUT = createHandler('PUT') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createHandler('DELETE') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
