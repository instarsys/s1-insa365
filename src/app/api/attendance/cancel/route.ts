import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { year, month } = await request.json();

    if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

    const { salaryCalcRepo, attendanceRepo, salaryAttendanceRepo, auditLogRepo } = getContainer();

    // 급여가 CONFIRMED/PAID 상태이면 근태 취소 불가
    const calculations = await salaryCalcRepo.findByPeriod(auth.companyId, year, month);
    const blocked = calculations.filter((c) => c.status === 'CONFIRMED' || c.status === 'PAID');
    if (blocked.length > 0) {
      return errorResponse('급여가 확정된 상태입니다. 급여 확정을 먼저 취소해주세요.', 400);
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    // 1. 근태 확정 해제
    const unconfirmedCount = await attendanceRepo.unconfirmByDateRange(auth.companyId, startDate, endDate);

    // 2. 자동 생성된 결근 삭제
    await attendanceRepo.deleteAutoAbsentByDateRange(auth.companyId, startDate, endDate);

    // 3. 스냅샷 삭제
    await salaryAttendanceRepo.deleteByPeriod(auth.companyId, year, month);

    // 4. 감사 로그
    await auditLogRepo.create({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'CANCEL',
      entityType: 'Attendance',
      after: { year, month, cancelledCount: unconfirmedCount } as Record<string, unknown>,
    });

    return successResponse({ cancelledCount: unconfirmedCount });
  } catch (error) {
    console.error('[attendance/cancel] 근태 확정 취소 오류:', error);
    return errorResponse('근태 확정 취소 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('MANAGER', handler) as (request: NextRequest) => Promise<NextResponse>;
