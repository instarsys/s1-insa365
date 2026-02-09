import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, parseSearchParams } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const { year, month, departmentId } = parseSearchParams(url);

  if (!year || !month) return errorResponse('연도와 월을 지정해주세요.', 400);

  const { attendanceRepo } = getContainer();

  const employees = await attendanceRepo.findEmployeesWithWeeklyAttendances(
    auth.companyId,
    year,
    month,
    { departmentId },
  );

  // Group by week and check 52h limit
  const WEEKLY_LIMIT_MINUTES = 52 * 60;
  const WARNING_THRESHOLD_MINUTES = 48 * 60;

  const results = employees.map((emp) => {
    // Simple weekly grouping by ISO week
    const weeklyMap = new Map<string, number>();
    for (const att of emp.attendances) {
      const d = new Date(att.date);
      const week = getISOWeek(d);
      const key = `${d.getFullYear()}-W${week}`;
      weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + att.totalMinutes);
    }

    const weeks = Array.from(weeklyMap.entries()).map(([week, minutes]) => ({
      week,
      totalMinutes: minutes,
      totalHours: Math.round((minutes / 60) * 10) / 10,
      isOverLimit: minutes > WEEKLY_LIMIT_MINUTES,
      isWarning: minutes > WARNING_THRESHOLD_MINUTES,
    }));

    return {
      id: emp.id,
      name: emp.name,
      employeeNumber: emp.employeeNumber,
      department: emp.department?.name,
      weeks,
      hasViolation: weeks.some((w) => w.isOverLimit),
      hasWarning: weeks.some((w) => w.isWarning),
    };
  });

  return successResponse({
    year,
    month,
    items: results,
    violationCount: results.filter((r) => r.hasViolation).length,
    warningCount: results.filter((r) => r.hasWarning).length,
  });
}

function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
