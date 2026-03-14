import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import {
  successResponse,
  errorResponse,
  validateBody,
} from '@/presentation/api/helpers';
import { rehireSchema } from '@/presentation/api/schemas/employee';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePost(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();

  const validation = validateBody(rehireSchema, body);
  if (!validation.success) return validation.response;
  const { rehireDate, cancel } = validation.data;

  const { rehireEmployeeUseCase, employeeRepo, auditLogRepo } = getContainer();

  const existing = await employeeRepo.findById(auth.companyId, id);
  if (!existing) {
    return errorResponse('직원을 찾을 수 없습니다.', 404);
  }

  await rehireEmployeeUseCase.execute(auth.companyId, id, { rehireDate, cancel });

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'User',
    entityId: id,
    before: { employeeStatus: existing.employeeStatus, resignDate: existing.resignDate, resignReason: existing.resignReason },
    after: { employeeStatus: 'ACTIVE', ...(cancel ? {} : { joinDate: rehireDate }), resignDate: null, resignReason: null },
  });

  return successResponse({ message: cancel ? '퇴직이 취소되었습니다.' : '재입사 처리되었습니다.' });
}

function createHandler() {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withAuth(handlePost);
    return wrapped(request, routeContext);
  };
}

export const POST = createHandler() as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
