import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { auditLogService } from '@/infrastructure/audit/AuditLogService';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import {
  successResponse,
  errorResponse,
  noContentResponse,
} from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePost(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();

  const { leaveStartDate, leaveReason } = body;
  if (!leaveStartDate || !leaveReason) {
    return errorResponse('휴직 시작일과 사유는 필수입니다.');
  }

  const { startLeaveUseCase, employeeRepo } = getContainer();

  const existing = await employeeRepo.findById(auth.companyId, id);
  if (!existing) {
    return errorResponse('직원을 찾을 수 없습니다.', 404);
  }

  await startLeaveUseCase.execute(auth.companyId, id, { leaveStartDate, leaveReason });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'User',
    entityId: id,
    before: { employeeStatus: existing.employeeStatus },
    after: { employeeStatus: 'ON_LEAVE', leaveStartDate, leaveReason },
  });

  return successResponse({ message: '휴직 처리되었습니다.' });
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json().catch(() => ({}));

  const { returnDate } = body;
  if (!returnDate) {
    return errorResponse('복귀일은 필수입니다.');
  }

  const { returnFromLeaveUseCase, employeeRepo } = getContainer();

  const existing = await employeeRepo.findById(auth.companyId, id);
  if (!existing) {
    return errorResponse('직원을 찾을 수 없습니다.', 404);
  }

  await returnFromLeaveUseCase.execute(auth.companyId, id, { returnDate });

  await auditLogService.log({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'User',
    entityId: id,
    before: { employeeStatus: existing.employeeStatus },
    after: { employeeStatus: 'ACTIVE', leaveEndDate: returnDate },
  });

  return noContentResponse();
}

function createHandler(method: 'POST' | 'DELETE') {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const methods = { POST: handlePost, DELETE: handleDelete };
    const wrapped = withAuth(methods[method]);
    return wrapped(request, routeContext);
  };
}

export const POST = createHandler('POST') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
export const DELETE = createHandler('DELETE') as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
