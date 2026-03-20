import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { leaveRequestRepo, leaveBalanceRepo, notificationRepo, attendanceRepo } = getContainer();

  const leaveRequest = await leaveRequestRepo.findByIdWithConfig(auth.companyId, id);

  if (!leaveRequest) return notFoundResponse('휴가 신청');
  if (leaveRequest.status !== 'PENDING') {
    return errorResponse('대기 중인 신청만 승인할 수 있습니다.', 400);
  }

  // 근태 중복 검사
  const existingAttendances = await attendanceRepo.findExistingByDateRange(
    auth.companyId, leaveRequest.userId,
    new Date(leaveRequest.startDate), new Date(leaveRequest.endDate),
  );
  if (existingAttendances.length > 0) {
    const dates = existingAttendances.map((a: { date: Date }) => a.date.toISOString().slice(0, 10)).join(', ');
    return errorResponse(`해당 기간에 근태 기록이 존재하여 휴가를 승인할 수 없습니다. 근태를 먼저 삭제해주세요. (근태 기록일: ${dates})`, 409);
  }

  const updated = await leaveRequestRepo.update(auth.companyId, id, {
    status: 'APPROVED',
    approvedBy: auth.userId,
    approvedAt: new Date(),
  });

  // Update leave balance (skip if leaveTypeConfig says deductsFromBalance=false)
  const shouldDeduct = leaveRequest.leaveTypeConfig
    ? leaveRequest.leaveTypeConfig.deductsFromBalance
    : true;

  if (shouldDeduct) {
    const year = new Date(leaveRequest.startDate).getFullYear();
    const balance = await leaveBalanceRepo.findByUserAndYear(auth.companyId, leaveRequest.userId, year);

    if (balance) {
      await leaveBalanceRepo.update(auth.companyId, balance.id, {
        usedDays: { increment: leaveRequest.days },
        remainingDays: { decrement: leaveRequest.days },
      });
    }
  }

  // Create notification
  await notificationRepo.create({
    companyId: auth.companyId,
    userId: leaveRequest.userId,
    type: 'LEAVE_APPROVED',
    priority: 'MEDIUM',
    title: '휴가 승인',
    message: '신청하신 휴가가 승인되었습니다.',
    link: `/e/leave`,
  });

  return successResponse(updated);
}

function createRoute() {
  return async (request: NextRequest, routeContext: RouteContext) => {
    (request as unknown as { routeContext: RouteContext }).routeContext = routeContext;
    const wrapped = withRole('MANAGER', handler);
    return wrapped(request);
  };
}

export const PUT = createRoute() as (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse>;
