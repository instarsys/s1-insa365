import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse } from '@/presentation/api/helpers';
import { getContainer } from '@/infrastructure/di/container';

async function handler(request: NextRequest, auth: AuthContext) {
  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10);
  const month = parseInt(url.searchParams.get('month') || String(new Date().getMonth() + 1), 10);
  const departmentId = url.searchParams.get('departmentId') || undefined;
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const employeeStatus = url.searchParams.get('employeeStatus') || 'ACTIVE';

  if (month < 1 || month > 12) return errorResponse('올바른 월을 지정해주세요.', 400);

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

  const { userRepo, attendanceRepo, workPolicyRepo, companyHolidayRepo } = getContainer();

  const { items: users, total: totalEmployees } = await userRepo.findForCalendar(
    auth.companyId,
    { employeeStatus, departmentId, page, limit },
  );

  const userIds = users.map((u) => u.id);

  // 근태 데이터
  const attendances = await attendanceRepo.findByUserIdsAndDateRange(
    auth.companyId,
    userIds,
    startDate,
    endDate,
  );

  // 회사 휴일 조회
  const companyHolidays = await companyHolidayRepo.findByPeriod(auth.companyId, startDate, endDate);
  const holidays = companyHolidays.map((h: { date: Date }) => new Date(h.date).getUTCDate());

  // WorkPolicy 조회 (직원별 workDayPattern 결정용)
  const allPolicies = await workPolicyRepo.findAll(auth.companyId);
  const policyMap = new Map(allPolicies.map((p) => [p.id, p]));
  const defaultPolicy = allPolicies.find((p) => p.isDefault);

  // Build per-user, per-day map
  const items = users.map((user) => {
    const userAttendances = attendances.filter((a) => a.userId === user.id);
    const attendancesByDay: Record<number, {
      id: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      status: string;
      isConfirmed: boolean;
      totalMinutes: number;
      note: string | null;
      lateMinutes: number;
      earlyLeaveMinutes: number;
    } | null> = {};

    let workDays = 0;
    for (const att of userAttendances) {
      const day = new Date(att.date).getUTCDate();
      attendancesByDay[day] = {
        id: att.id,
        checkInTime: att.checkInTime?.toISOString() ?? null,
        checkOutTime: att.checkOutTime?.toISOString() ?? null,
        status: att.status,
        isConfirmed: att.isConfirmed,
        totalMinutes: att.totalMinutes,
        note: att.note,
        lateMinutes: att.lateMinutes ?? 0,
        earlyLeaveMinutes: att.earlyLeaveMinutes ?? 0,
      };
      if (att.checkInTime) workDays++;
    }

    // 직원별 WorkPolicy에서 workDays 패턴 조회
    const empPolicy = user.workPolicyId
      ? policyMap.get(user.workPolicyId)
      : defaultPolicy;
    const workDayPattern = empPolicy?.workDays ?? '1,2,3,4,5';

    return {
      userId: user.id,
      userName: user.name,
      employeeNumber: user.employeeNumber,
      departmentName: user.department?.name ?? null,
      workDays,
      workDayPattern,
      attendances: attendancesByDay,
    };
  });

  // Daily summary: count of employees who checked in per day
  const dailySummary: Record<number, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailySummary[d] = attendances.filter((a) => {
      const day = new Date(a.date).getUTCDate();
      return day === d && a.checkInTime;
    }).length;
  }

  return successResponse({
    year,
    month,
    daysInMonth,
    totalEmployees,
    totalPages: Math.ceil(totalEmployees / limit),
    page,
    items,
    dailySummary,
    holidays,
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
