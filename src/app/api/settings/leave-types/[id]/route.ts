import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse, validateBody } from '@/presentation/api/helpers';
import { createLeaveTypeConfigSchema } from '@/presentation/api/schemas';
import { getContainer } from '@/infrastructure/di/container';

type RouteContext = { params: Promise<{ id: string }> };

async function putHandler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  try {
    const { leaveTypeConfigRepo } = getContainer();
    const typeConfig = await leaveTypeConfigRepo.findById(auth.companyId, id);
    if (!typeConfig) return notFoundResponse('휴가 유형');

    const body = await request.json();
    const validation = validateBody(createLeaveTypeConfigSchema.partial(), body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    if (typeConfig.isSystem && data.code && data.code !== typeConfig.code) {
      return errorResponse('시스템 휴가 유형의 코드는 변경할 수 없습니다.', 400);
    }

    const updated = await leaveTypeConfigRepo.update(auth.companyId, id, {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.leaveGroupId !== undefined && { leaveGroupId: data.leaveGroupId }),
      ...(data.timeOption !== undefined && { timeOption: data.timeOption }),
      ...(data.paidHours !== undefined && { paidHours: data.paidHours }),
      ...(data.deductionDays !== undefined && { deductionDays: data.deductionDays }),
      ...(data.deductsFromBalance !== undefined && { deductsFromBalance: data.deductsFromBalance }),
      ...(data.requiresApproval !== undefined && { requiresApproval: data.requiresApproval }),
      ...(data.maxConsecutiveDays !== undefined && { maxConsecutiveDays: data.maxConsecutiveDays }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    });

    return successResponse(updated);
  } catch {
    return errorResponse('휴가 유형 수정 중 오류가 발생했습니다.', 500);
  }
}

async function deleteHandler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { leaveTypeConfigRepo } = getContainer();
  const typeConfig = await leaveTypeConfigRepo.findById(auth.companyId, id);
  if (!typeConfig) return notFoundResponse('휴가 유형');
  if (typeConfig.isSystem) return errorResponse('시스템 휴가 유형은 삭제할 수 없습니다.', 400);

  await leaveTypeConfigRepo.softDelete(auth.companyId, id);

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
