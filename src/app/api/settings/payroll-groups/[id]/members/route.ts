import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

type RouteContext = { params: Promise<{ id: string }> };

async function getHandler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const { crudPayrollGroupUseCase } = getContainer();
  const members = await crudPayrollGroupUseCase.getMembers(auth.companyId, id);
  return successResponse({ items: members });
}

async function postHandler(request: NextRequest, auth: AuthContext) {
  try {
    const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
    const body = await request.json();
    const { crudPayrollGroupUseCase } = getContainer();

    if (body.action === 'assign' && Array.isArray(body.userIds)) {
      await crudPayrollGroupUseCase.assignMembers(auth.companyId, id, body.userIds);
      return successResponse({ success: true });
    }

    if (body.action === 'unassign' && Array.isArray(body.userIds)) {
      await crudPayrollGroupUseCase.unassignMembers(auth.companyId, body.userIds);
      return successResponse({ success: true });
    }

    if (body.action === 'addManager' && body.userId) {
      await crudPayrollGroupUseCase.addManager(auth.companyId, id, body.userId);
      return successResponse({ success: true });
    }

    if (body.action === 'removeManager' && body.userId) {
      await crudPayrollGroupUseCase.removeManager(auth.companyId, id, body.userId);
      return successResponse({ success: true });
    }

    return errorResponse('유효하지 않은 요청입니다. action: assign/unassign/addManager/removeManager', 400);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : '멤버 관리에 실패했습니다.', 400);
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
export const POST = createRoute(postHandler, 'COMPANY_ADMIN') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
