import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, notFoundResponse } from '@/presentation/api/helpers';

interface RouteContext { params: Promise<{ id: string }> }

async function handlePatch(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;
  const body = await request.json();
  const { reason, startDate, endDate, days } = body;

  const { leaveRequestRepo, auditLogRepo } = getContainer();

  const updateData: Record<string, unknown> = {};
  if (reason !== undefined) updateData.reason = reason;
  if (startDate) updateData.startDate = new Date(startDate);
  if (endDate) updateData.endDate = new Date(endDate);
  if (days !== undefined) updateData.days = days;

  const updated = await leaveRequestRepo.update(auth.companyId, id, updateData);
  if (!updated) return notFoundResponse('휴가 신청');

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'UPDATE',
    entityType: 'LeaveRequest',
    entityId: id,
    after: updateData,
  });

  return successResponse(updated);
}

async function handleDelete(request: NextRequest, auth: AuthContext) {
  const { id } = await (request as unknown as { routeContext: RouteContext }).routeContext.params;

  const { leaveRequestRepo, leaveBalanceRepo, auditLogRepo } = getContainer();

  const deleted = await leaveRequestRepo.softDelete(auth.companyId, id);
  if (!deleted) return notFoundResponse('휴가 신청');

  // APPROVED 상태이고 deductsFromBalance이면 잔여일수 복원
  if (deleted.status === 'APPROVED') {
    const shouldRestore = (deleted as unknown as { leaveTypeConfig?: { deductsFromBalance?: boolean } })
      .leaveTypeConfig?.deductsFromBalance ?? true;

    if (shouldRestore) {
      const year = new Date(deleted.startDate).getFullYear();
      const balance = await leaveBalanceRepo.findByUserAndYear(auth.companyId, deleted.userId, year);
      if (balance) {
        await leaveBalanceRepo.update(auth.companyId, balance.id, {
          usedDays: { decrement: deleted.days },
          remainingDays: { increment: deleted.days },
        });
      }
    }
  }

  await auditLogRepo.create({
    userId: auth.userId,
    companyId: auth.companyId,
    action: 'DELETE',
    entityType: 'LeaveRequest',
    entityId: id,
    before: { userId: deleted.userId, startDate: deleted.startDate, days: deleted.days, status: deleted.status },
  });

  return successResponse({ message: '휴가가 삭제되었습니다.' });
}

const wrapped = withAuth((request: NextRequest, auth: AuthContext) => {
  if (request.method === 'PUT') return handlePatch(request, auth);
  return handleDelete(request, auth);
});
export const PUT = wrapped as (request: NextRequest) => Promise<NextResponse>;
export const DELETE = wrapped as (request: NextRequest) => Promise<NextResponse>;
