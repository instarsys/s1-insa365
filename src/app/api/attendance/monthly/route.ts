import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month, departmentId } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { attendanceRepo } = getContainer();

  const employees = await attendanceRepo.findEmployeesWithMonthlyAttendances(
    auth.companyId,
    year,
    month,
    { departmentId },
  );

  const summary = employees.map((emp) => {
    const atts = emp.attendances;
    return {
      ...emp,
      summary: {
        workDays: atts.filter((a) => a.checkInTime).length,
        totalRegularMinutes: atts.reduce((s, a) => s + a.regularMinutes, 0),
        totalOvertimeMinutes: atts.reduce((s, a) => s + a.overtimeMinutes, 0),
        totalNightMinutes: atts.reduce((s, a) => s + a.nightMinutes, 0),
        totalMinutes: atts.reduce((s, a) => s + a.totalMinutes, 0),
        confirmed: atts.every((a) => a.isConfirmed),
      },
    };
  });

  return successResponse({ year, month, items: summary });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
