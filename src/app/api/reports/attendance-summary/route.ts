import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { attendanceRepo } = getContainer();
  const attendances = await attendanceRepo.findAllByMonth(auth.companyId, year, month);

  const summary = {
    year,
    month,
    totalRecords: attendances.length,
    onTime: attendances.filter((a) => a.status === 'ON_TIME').length,
    late: attendances.filter((a) => a.status === 'LATE').length,
    earlyLeave: attendances.filter((a) => a.status === 'EARLY_LEAVE').length,
    absent: attendances.filter((a) => a.status === 'ABSENT').length,
    leave: attendances.filter((a) => a.status === 'LEAVE').length,
    totalRegularMinutes: attendances.reduce((s, a) => s + a.regularMinutes, 0),
    totalOvertimeMinutes: attendances.reduce((s, a) => s + a.overtimeMinutes, 0),
    totalNightMinutes: attendances.reduce((s, a) => s + a.nightMinutes, 0),
    avgWorkMinutesPerDay: attendances.length > 0
      ? Math.round(attendances.reduce((s, a) => s + a.totalMinutes, 0) / attendances.length)
      : 0,
  };

  return successResponse(summary);
}

export const GET = withRole('MANAGER', handler) as (request: NextRequest) => Promise<NextResponse>;
