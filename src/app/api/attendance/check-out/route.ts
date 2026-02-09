import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const { latitude, longitude } = await request.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { attendanceRepo } = getContainer();

    const attendance = await attendanceRepo.findByDate(auth.companyId, auth.userId, today);

    if (!attendance) {
      return errorResponse('출근 기록이 없습니다. 먼저 출근해주세요.', 400);
    }

    if (attendance.checkOutTime) {
      return errorResponse('이미 퇴근 기록이 있습니다.', 400);
    }

    const now = new Date();
    let totalMinutes = 0;

    if (attendance.checkInTime) {
      totalMinutes = Math.floor(
        (now.getTime() - attendance.checkInTime.getTime()) / 60000,
      );
    }

    const updated = await attendanceRepo.update(auth.companyId, attendance.id, {
        checkOutTime: now,
        checkOutLatitude: latitude ?? null,
        checkOutLongitude: longitude ?? null,
        totalMinutes,
      });

    return successResponse(updated);
  } catch {
    return errorResponse('퇴근 처리 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
