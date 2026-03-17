import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const yearStr = url.searchParams.get('year');
  const monthStr = url.searchParams.get('month');

  if (!yearStr || !monthStr) return errorResponse('연도와 월을 지정해주세요.', 400);

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return errorResponse('유효한 연도와 월을 입력해주세요.', 400);
  }

  const { attendanceRepo } = getContainer();
  const attendanceRecords = await attendanceRepo.findMonthly(auth.companyId, auth.userId, year, month);

  const items = attendanceRecords.map((a) => ({
    date: a.date.toISOString().slice(0, 10),
    checkInTime: a.checkInTime?.toISOString() ?? null,
    checkOutTime: a.checkOutTime?.toISOString() ?? null,
    status: a.status,
    regularMinutes: a.regularMinutes,
    overtimeMinutes: a.overtimeMinutes,
    nightMinutes: a.nightMinutes,
    totalMinutes: a.totalMinutes,
    isHoliday: a.isHoliday,
    isOutOfRange: (a as Record<string, unknown>).isOutOfRange ?? false,
    checkInLocationName: (a as Record<string, unknown>).checkInLocationName ?? null,
    checkOutLocationName: (a as Record<string, unknown>).checkOutLocationName ?? null,
    note: a.note,
  }));

  return successResponse({ year, month, items });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
