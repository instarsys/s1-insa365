import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

type RouteContext = { params: Promise<{ id: string }> };

async function getHandler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const { crudPayrollGroupUseCase } = getContainer();
  const group = await crudPayrollGroupUseCase.getById(auth.companyId, id);
  if (!group) return errorResponse('급여 그룹을 찾을 수 없습니다.', 404);
  return successResponse(group);
}

async function putHandler(request: NextRequest, auth: AuthContext) {
  try {
    const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
    const body = await request.json();
    const { crudPayrollGroupUseCase } = getContainer();
    const group = await crudPayrollGroupUseCase.update(auth.companyId, id, {
      name: body.name,
      code: body.code,
      payDay: body.payDay,
      description: body.description,
      sortOrder: body.sortOrder,
      isDefault: body.isDefault,
      isActive: body.isActive,
    });
    return successResponse(group);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '급여 그룹 수정에 실패했습니다.', 400);
  }
}

async function deleteHandler(request: NextRequest, auth: AuthContext) {
  try {
    const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
    const { crudPayrollGroupUseCase } = getContainer();
    await crudPayrollGroupUseCase.delete(auth.companyId, id);
    return successResponse({ success: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '급여 그룹 삭제에 실패했습니다.', 400);
  }
}

function createRoute(handler: (request: NextRequest, auth: AuthContext) => Promise<NextResponse>, role: 'COMPANY_ADMIN' | 'MANAGER') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withRole(role, handler);
    return wrapped(request);
  };
}

export const GET = createRoute(getHandler, 'MANAGER') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const PUT = createRoute(putHandler, 'COMPANY_ADMIN') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createRoute(deleteHandler, 'COMPANY_ADMIN') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
