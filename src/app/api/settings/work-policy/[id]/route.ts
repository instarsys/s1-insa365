import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse, noContentResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handlePut(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();

  const existing = await getContainer().workPolicyRepo.findById(auth.companyId, id);
  if (!existing) return notFoundResponse('근무 정책');

  if (body.isDefault) {
    await getContainer().workPolicyRepo.unsetDefaultExcept(auth.companyId, id);
  }

  const updated = await getContainer().workPolicyRepo.update(auth.companyId, id, {
    ...(body.name && { name: body.name }),
    ...(body.startTime && { startTime: body.startTime }),
    ...(body.endTime && { endTime: body.endTime }),
    ...(body.breakMinutes !== undefined && { breakMinutes: body.breakMinutes }),
    ...(body.workDays && { workDays: body.workDays }),
    ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
    ...(body.lateGraceMinutes !== undefined && { lateGraceMinutes: body.lateGraceMinutes }),
    ...(body.earlyLeaveGraceMinutes !== undefined && { earlyLeaveGraceMinutes: body.earlyLeaveGraceMinutes }),
    ...(body.nightWorkStartTime && { nightWorkStartTime: body.nightWorkStartTime }),
    ...(body.nightWorkEndTime && { nightWorkEndTime: body.nightWorkEndTime }),
    ...(body.overtimeThresholdMinutes !== undefined && { overtimeThresholdMinutes: body.overtimeThresholdMinutes }),
    ...(body.monthlyWorkHours !== undefined && { monthlyWorkHours: body.monthlyWorkHours }),
    ...(body.weeklyHoliday !== undefined && { weeklyHoliday: body.weeklyHoliday }),
    ...(body.weeklyWorkHours !== undefined && { weeklyWorkHours: body.weeklyWorkHours }),
    ...(body.weeklyOvertimeLimit !== undefined && { weeklyOvertimeLimit: body.weeklyOvertimeLimit }),
    ...(body.monthlyOvertimeLimit !== undefined && { monthlyOvertimeLimit: body.monthlyOvertimeLimit }),
  });

  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const existing = await getContainer().workPolicyRepo.findById(auth.companyId, id);
  if (!existing) return notFoundResponse('근무 정책');

  if (existing.isDefault) return errorResponse('기본 근무 정책은 삭제할 수 없습니다.', 400);

  const userCount = await getContainer().userRepo.countByWorkPolicy(auth.companyId, id);
  if (userCount > 0) return errorResponse('소속 직원이 있는 근무 정책은 삭제할 수 없습니다.', 400);

  await getContainer().workPolicyRepo.softDelete(auth.companyId, id);

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
