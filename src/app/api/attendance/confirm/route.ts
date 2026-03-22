import { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/infrastructure/di/container';
import { withPermission } from '@/presentation/middleware/withPermission';
import { type AuthContext } from '@/presentation/middleware/withAuth';
import { successResponse, errorResponse, validateBody } from '@/presentation/api/helpers';
import { confirmAttendanceSchema } from '@/presentation/api/schemas';
import { isWorkDay, countWorkDaysInMonth } from '@/domain/services/AttendanceClassifier';

/** 로컬 Date → YYYY-MM-DD (타임존 안전, toISOString 대체) */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function handler(request: NextRequest, auth: AuthContext) {
  try {
    const body = await request.json();
    const validation = validateBody(confirmAttendanceSchema, body);
    if (!validation.success) return validation.response;
    const { year, month, userIds, payrollGroupId } = validation.data;

    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    const { userRepo, attendanceRepo, salaryAttendanceRepo, employeeRepo, workPolicyRepo, leaveRequestRepo, auditLogRepo, companyHolidayRepo } = getContainer();

    // payrollGroupId가 있으면 해당 그룹 소속 활성 직원만 대상
    let targetUserIds = userIds;
    if (payrollGroupId && !userIds) {
      const groupEmployees = await employeeRepo.findAll(auth.companyId, {
        status: 'ACTIVE',
        payrollGroupId,
        page: 1,
        limit: 10000,
      });
      targetUserIds = groupEmployees.items.map((e: { id: string }) => e.id);
    }

    const employees = await userRepo.findActiveUsers(auth.companyId, targetUserIds);
    const empIds = employees.map((e) => e.id);

    // 회사 기본 WorkPolicy (fallback용)
    const defaultWorkPolicy = await workPolicyRepo.findDefault(auth.companyId);

    // 회사 휴일 조회
    const companyHolidays = await companyHolidayRepo.findByPeriod(auth.companyId, startDate, endDate);
    const holidayDates = new Set(
      companyHolidays.map((h: { date: Date }) => toDateStr(new Date(h.date))),
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

      // workDays 소정근로일수 계산 (근태면제 처리 전에 필요)
      const scheduledWorkDays = countWorkDaysInMonth(year, month, workDays);

      // 근태면제 직원: 결근 미생성, all-zero 스냅샷
      if (emp?.attendanceExempt) {
        const existing = await salaryAttendanceRepo.findByEmployeeAndPeriod(
          auth.companyId, empId, year, month,
        );
        await salaryAttendanceRepo.create({
          companyId: auth.companyId,
          userId: empId,
          year, month,
          workDays: scheduledWorkDays,
          actualWorkDays: scheduledWorkDays,
          absentDays: 0, lateDays: 0, earlyLeaveDays: 0, leaveDays: 0,
          totalRegularMinutes: 0, totalOvertimeMinutes: 0,
          totalNightMinutes: 0, totalNightOvertimeMinutes: 0,
          totalHolidayMinutes: 0, totalHolidayOvertimeMinutes: 0,
          totalHolidayNightMinutes: 0, totalHolidayNightOvertimeMinutes: 0,
          totalLateMinutes: 0, totalEarlyLeaveMinutes: 0,
          paidLeaveDays: 0, unpaidLeaveDays: 0, paidLeaveMinutes: 0,
          confirmedAt: now, confirmedBy: auth.userId,
          version: (existing?.version ?? 0) + 1,
        });
        continue;
      }

      // 해당 월의 기존 근태 레코드
      const attendances = await attendanceRepo.findMonthly(auth.companyId, empId, year, month);
      const attendanceDates = new Set(
        attendances.map((a) => toDateStr(new Date(a.date))),
      );

      // 승인된 휴가 조회
      const approvedLeaves = await leaveRequestRepo.findApprovedByPeriod(
        auth.companyId,
        empId,
        startDate,
        endDate,
      );

      // 직원의 1일 소정근로시간 (User.dailyWorkHours)
      const dailyWorkMinutes = Math.round(Number(emp?.dailyWorkHours ?? 8) * 60);

      // 휴가가 적용되는 날짜 Set + 유급/무급 분리
      const leaveDates = new Set<string>();
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      let paidLeaveMinutes = 0;

      for (const leave of approvedLeaves) {
        const isPaid = leave.leaveTypeConfig?.deductsFromBalance !== false;
        const leaveType = leave.type;
        const ls = new Date(leave.startDate);
        const le = new Date(leave.endDate);
        for (let d = new Date(ls); d <= le; d.setDate(d.getDate() + 1)) {
          leaveDates.add(toDateStr(d));
          const isHalf = leaveType === 'HALF_DAY_AM' || leaveType === 'HALF_DAY_PM';
          if (isPaid) {
            paidLeaveDays += isHalf ? 0.5 : 1;
            paidLeaveMinutes += isHalf ? Math.floor(dailyWorkMinutes / 2) : dailyWorkMinutes;
          } else {
            unpaidLeaveDays += isHalf ? 0.5 : 1;
          }
        }
      }

      // 결근 자동 생성: workDay인데 근태 없고 휴가도 없는 날
      const joinDate = emp?.joinDate ? new Date(emp.joinDate) : null;
      const resignDate = emp?.resignDate ? new Date(emp.resignDate) : null;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);   // 로컬 (요일 판정용)
        const dateStr = toDateStr(dateObj);               // 로컬 문자열 (Set 비교용)
        const dateUTC = new Date(Date.UTC(year, month - 1, d)); // UTC (DB 저장용)

        // 입사 전/퇴사 후 스킵 — 문자열 비교로 타임존 안전
        if (joinDate && dateStr < toDateStr(joinDate)) continue;
        if (resignDate && dateStr > toDateStr(resignDate)) continue;

        // 근무일이 아니면 스킵
        if (!isWorkDay(dateObj, workDays)) continue;

        // 회사 휴일이면 스킵 (결근 미생성)
        if (holidayDates.has(dateStr)) continue;

        // 이미 근태 기록 있으면 스킵
        if (attendanceDates.has(dateStr)) continue;

        // 휴가 있으면 LEAVE 근태 레코드 자동 생성
        if (leaveDates.has(dateStr)) {
          await attendanceRepo.create(auth.companyId, {
            companyId: auth.companyId,
            userId: empId,
            date: dateUTC,
            status: 'LEAVE',
            isHoliday: false,
          });
          continue;
        }

        // 결근 자동 생성
        await attendanceRepo.create(auth.companyId, {
          companyId: auth.companyId,
          userId: empId,
          date: dateUTC,    // UTC 자정
          status: 'ABSENT',
          isHoliday: false,
        });
      }

      // 결근 포함된 전체 근태 다시 조회
      const allAttendances = await attendanceRepo.findMonthly(auth.companyId, empId, year, month);

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
          paidLeaveDays,
          unpaidLeaveDays,
          paidLeaveMinutes,
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
  } catch (err) {
    console.error('[attendance/confirm] 근태 확정 오류:', err);
    const message = err instanceof Error ? err.message : '근태 확정 중 오류가 발생했습니다.';
    return errorResponse(message, 500);
  }
}

export const POST = withPermission('ATTENDANCE_MGMT', 'CONFIRM', handler) as (request: NextRequest) => Promise<NextResponse>;
