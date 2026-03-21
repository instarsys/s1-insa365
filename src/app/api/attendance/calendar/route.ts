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

  const { userRepo, attendanceRepo, workPolicyRepo, companyHolidayRepo, leaveRequestRepo } = getContainer();

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
  // PostgreSQL DATE → pg 드라이버 → JS Date (로컬 타임존 자정) → getDate()
  const holidays = companyHolidays.map((h: { date: Date }) => new Date(h.date).getDate());

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
      // PostgreSQL DATE는 pg 드라이버가 로컬 타임존 자정으로 반환하므로 getDate() 사용
      const day = new Date(att.date).getDate();
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
      attendanceExempt: user.attendanceExempt,
      workDays,
      workDayPattern,
      attendances: attendancesByDay,
    };
  });

  // 승인 휴가 조회 (달력 오버레이용)
  const leaves: Record<string, Record<number, { type: string; typeName: string }>> = {};
  for (const user of users) {
    const approvedLeaves = await leaveRequestRepo.findApprovedByPeriod(
      auth.companyId, user.id, startDate, endDate,
    );
    if (approvedLeaves.length > 0) {
      leaves[user.id] = {};
      for (const leave of approvedLeaves) {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        for (let d = new Date(leaveStart); d <= leaveEnd; d = new Date(d.getTime() + 86400000)) {
          const day = d.getDate();
          if (day >= 1 && day <= daysInMonth) {
            leaves[user.id][day] = {
              type: (leave as Record<string, unknown>).type as string ?? 'OTHER',
              typeName: ((leave as Record<string, unknown>).leaveTypeConfig as { name?: string })?.name
                ?? (leave as Record<string, unknown>).type as string ?? '휴가',
            };
          }
        }
      }
    }
  }

  // Daily summary: count of employees who checked in per day
  const dailySummary: Record<number, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailySummary[d] = attendances.filter((a) => {
      const day = new Date(a.date).getDate();
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
    leaves,
  });
}

export const GET = withAuth(handler) as (request: NextRequest) => Promise<NextResponse>;
