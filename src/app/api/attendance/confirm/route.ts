import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withRole } from '@/presentation/middleware/withRole';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { confirmAttendanceSchema } from '@/presentation/api/schemas';
import { isWorkDay, countWorkDaysInMonth } from '@/domain/services/AttendanceClassifier';

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(confirmAttendanceSchema, body);
    if (!validation.success) return validation.response;
    const { year, month, userIds } = validation.data;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { userRepo, attendanceRepo, salaryAttendanceRepo, employeeRepo, workPolicyRepo, leaveRequestRepo, auditLogRepo, companyHolidayRepo } = getContainer();

    const employees = await userRepo.findActiveUsers(auth.companyId, userIds);
    const empIds = employees.map((e) => e.id);

    // 회사 기본 WorkPolicy (fallback용)
    const defaultWorkPolicy = await workPolicyRepo.findDefault(auth.companyId);

    // 회사 휴일 조회
    const companyHolidays = await companyHolidayRepo.findByPeriod(auth.companyId, startDate, endDate);
    const holidayDates = new Set(
      companyHolidays.map((h: { date: Date }) => h.date.toISOString().split('T')[0]),
    );

    // 결근 자동 생성 + 근태 확정
    const now = new Date();
    for (const empId of empIds) {
      // 직원별 WorkPolicy 조회
      const emp = await employeeRepo.findById(auth.companyId, empId);
      const wpId = emp?.workPolicyId;
      const workPolicy = wpId
        ? await workPolicyRepo.findById(auth.companyId, wpId)
        : defaultWorkPolicy;

      const workDays = workPolicy?.workDays ?? '1,2,3,4,5';

      // 해당 월의 기존 근태 레코드
      const attendances = await attendanceRepo.findMonthly(auth.companyId, empId, year, month);
      const attendanceDates = new Set(
        attendances.map((a) => a.date.toISOString().split('T')[0]),
      );

      // 승인된 휴가 조회
      const approvedLeaves = await leaveRequestRepo.findApprovedByPeriod(
        auth.companyId,
        empId,
        startDate,
        endDate,
      );

      // 휴가가 적용되는 날짜 Set
      const leaveDates = new Set<string>();
      for (const leave of approvedLeaves) {
        const ls = new Date(leave.startDate);
        const le = new Date(leave.endDate);
        for (let d = new Date(ls); d <= le; d.setDate(d.getDate() + 1)) {
          leaveDates.add(d.toISOString().split('T')[0]);
        }
      }

      // 결근 자동 생성: workDay인데 근태 없고 휴가도 없는 날
      const daysInMonth = new Date(year, month, 0).getDate();
      const joinDate = emp?.joinDate ? new Date(emp.joinDate) : null;
      const resignDate = emp?.resignDate ? new Date(emp.resignDate) : null;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        const dateStr = dateObj.toISOString().split('T')[0];

        // 입사 전/퇴사 후 스킵
        if (joinDate && dateObj < joinDate) continue;
        if (resignDate && dateObj > resignDate) continue;

        // 근무일이 아니면 스킵
        if (!isWorkDay(dateObj, workDays)) continue;

        // 회사 휴일이면 스킵 (결근 미생성)
        if (holidayDates.has(dateStr)) continue;

        // 이미 근태 기록 있으면 스킵
        if (attendanceDates.has(dateStr)) continue;

        // 휴가 있으면 스킵
        if (leaveDates.has(dateStr)) continue;

        // 결근 자동 생성
        await attendanceRepo.create(auth.companyId, {
          companyId: auth.companyId,
          userId: empId,
          date: dateObj,
          status: 'ABSENT',
          isHoliday: false,
        });
      }

      // 결근 포함된 전체 근태 다시 조회
      const allAttendances = await attendanceRepo.findMonthly(auth.companyId, empId, year, month);

      // workDays 소정근로일수 계산
      const scheduledWorkDays = countWorkDaysInMonth(year, month, workDays);

      const existing = await salaryAttendanceRepo.findByEmployeeAndPeriod(
        auth.companyId, empId, year, month,
      );

      await salaryAttendanceRepo.create({
          companyId: auth.companyId,
          userId: empId,
          year,
          month,
          workDays: scheduledWorkDays,
          actualWorkDays: allAttendances.filter((a) => a.checkInTime && a.status !== 'ABSENT').length,
          absentDays: allAttendances.filter((a) => a.status === 'ABSENT').length,
          lateDays: allAttendances.filter((a) => a.status === 'LATE').length,
          earlyLeaveDays: allAttendances.filter((a) => a.status === 'EARLY_LEAVE').length,
          leaveDays: allAttendances.filter((a) => a.status === 'LEAVE').length,
          totalRegularMinutes: allAttendances.reduce((s, a) => s + a.regularMinutes, 0),
          totalOvertimeMinutes: allAttendances.reduce((s, a) => s + a.overtimeMinutes, 0),
          totalNightMinutes: allAttendances.reduce((s, a) => s + a.nightMinutes, 0),
          totalNightOvertimeMinutes: allAttendances.reduce((s, a) => s + a.nightOvertimeMinutes, 0),
          totalHolidayMinutes: allAttendances.reduce((s, a) => s + a.holidayMinutes, 0),
          totalHolidayOvertimeMinutes: allAttendances.reduce((s, a) => s + a.holidayOvertimeMinutes, 0),
          totalHolidayNightMinutes: allAttendances.reduce((s, a) => s + a.holidayNightMinutes, 0),
          totalHolidayNightOvertimeMinutes: allAttendances.reduce((s, a) => s + a.holidayNightOvertimeMinutes, 0),
          totalLateMinutes: allAttendances.reduce((s, a) => s + (a.lateMinutes ?? 0), 0),
          totalEarlyLeaveMinutes: allAttendances.reduce((s, a) => s + (a.earlyLeaveMinutes ?? 0), 0),
          confirmedAt: now,
          confirmedBy: auth.userId,
          version: (existing?.version ?? 0) + 1,
      });
    }

    // Mark attendances as confirmed
    await attendanceRepo.confirmByDateRange(auth.companyId, empIds, startDate, endDate);

    await auditLogRepo.create({
      userId: auth.userId,
      companyId: auth.companyId,
      action: 'CONFIRM',
      entityType: 'Attendance',
      after: { year, month, confirmedCount: empIds.length } as Record<string, unknown>,
    });

    return successResponse({ confirmedCount: empIds.length });
  } catch {
    return errorResponse('근태 확정 중 오류가 발생했습니다.', 500);
  }
}

export const POST = withRole('MANAGER', handler) as (request: NextRequest) => Promise<NextResponse>;
