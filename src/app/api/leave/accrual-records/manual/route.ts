import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { manualAdjustmentSchema } from '@/presentation/api/schemas';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const body = await request.json();
  const validation = validateBody(manualAdjustmentSchema, body);
  if (!validation.success) return validation.response;

  const { userId, year, days, reason, leaveTypeConfigId } = validation.data;

  const { leaveAccrualRecordRepo, auditLogRepo, leaveBalanceRepo } = getContainer();

  const periodStart = new Date(year, 0, 1);
  const periodEnd = new Date(year, 11, 31);

  // Get current balance before adjustment
  const beforeBalance = await leaveBalanceRepo.findByUserAndYear(auth.companyId, userId, year);

  await leaveAccrualRecordRepo.createWithBalanceUpdate(
    {
      companyId: auth.companyId,
      userId,
      leaveTypeConfigId,
      year,
      accrualDays: days,
      periodStart,
      periodEnd,
      source: 'MANUAL',
      description: reason,
    },
    {
      companyId: auth.companyId,
      userId,
      year,
      accrualDays: days,
    },
  );

  // Get updated balance
  const afterBalance = await leaveBalanceRepo.findByUserAndYear(auth.companyId, userId, year);

  // Audit log
  await auditLogRepo.create({
    companyId: auth.companyId,
    userId: auth.userId,
    action: 'UPDATE',
    entityType: 'LeaveBalance',
    entityId: userId,
    before: beforeBalance ? { totalDays: Number(beforeBalance.totalDays), remainingDays: Number(beforeBalance.remainingDays) } : null,
    after: afterBalance ? { totalDays: Number(afterBalance.totalDays), remainingDays: Number(afterBalance.remainingDays), adjustmentDays: days, reason } : null,
  });

  return successResponse({
    message: days > 0 ? `${days}일이 추가되었습니다.` : `${Math.abs(days)}일이 차감되었습니다.`,
    balance: afterBalance ? {
      totalDays: Number(afterBalance.totalDays),
      usedDays: Number(afterBalance.usedDays),
      remainingDays: Number(afterBalance.remainingDays),
    } : null,
  });
}

export const POST = withRole('COMPANY_ADMIN', handler) as (request: NextRequest) => Promise<NextResponse>;
