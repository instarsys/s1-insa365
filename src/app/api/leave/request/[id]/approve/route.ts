import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

type RouteContext = { params: Promise<{ id: string }> };

async function handler(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { leaveRequestRepo, leaveBalanceRepo, notificationRepo } = getContainer();

  const leaveRequest = await leaveRequestRepo.findByIdWithConfig(auth.companyId, id);

  if (!leaveRequest) return notFoundResponse('휴가 신청');
  if (leaveRequest.status !== 'PENDING') {
    return errorResponse('대기 중인 신청만 승인할 수 있습니다.', 400);
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
