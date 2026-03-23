import type { IUserRepository } from '../../ports/IUserRepository';
import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { IAttendanceRepository } from '../../ports/IAttendanceRepository';
import type { ISalaryAttendanceDataRepository } from '../../ports/ISalaryAttendanceDataRepository';
import type { ILeaveRequestRepository } from '../../ports/ILeaveRequestRepository';
import type { IWorkPolicyRepository } from '../../ports/IWorkPolicyRepository';
import type { ICompanyHolidayRepository } from '../../ports/ICompanyHolidayRepository';
import type { IAuditLogRepository } from '../../ports/IAuditLogRepository';
import type { ConfirmAttendanceDto } from '../../dtos/attendance';
import { AttendanceClassifier, isWorkDay, countWorkDaysInMonth } from '@domain/services/AttendanceClassifier';

/** 로컬 Date → YYYY-MM-DD (타임존 안전, toISOString 대체) */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class ConfirmAttendanceUseCase {
  constructor(
    private userRepo: IUserRepository,
    private employeeRepo: IEmployeeRepository,
    private attendanceRepo: IAttendanceRepository,
    private salaryAttendanceDataRepo: ISalaryAttendanceDataRepository,
    private leaveRequestRepo: ILeaveRequestRepository,
    private workPolicyRepo: IWorkPolicyRepository,
    private companyHolidayRepo: ICompanyHolidayRepository,
    private auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(
    companyId: string,
    dto: ConfirmAttendanceDto,
    confirmedBy: string,
  ): Promise<{ confirmedCount: number }> {
    const { year, month, userIds, payrollGroupId } = dto;

    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    // payrollGroupId가 있으면 해당 그룹 소속 활성 직원만 대상
    let targetUserIds = userIds;
    if (payrollGroupId && !userIds) {
      const groupEmployees = await this.employeeRepo.findAll(companyId, {
        status: 'ACTIVE',
        payrollGroupId,
        page: 1,
        limit: 10000,
      });
      targetUserIds = groupEmployees.items.map((e: { id: string }) => e.id);
    }

    const employees = await this.userRepo.findActiveUsers(companyId, targetUserIds);
    const empIds = employees.map((e) => e.id);

    // 회사 기본 WorkPolicy (fallback용)
    const defaultWorkPolicy = await this.workPolicyRepo.findDefault(companyId);

    // 회사 휴일 조회
    const companyHolidays = await this.companyHolidayRepo.findByPeriod(companyId, startDate, endDate);
    const holidayDates = new Set(
      companyHolidays.map((h: { date: Date | string }) => toDateStr(new Date(h.date))),
    );

    const now = new Date();
    for (const empId of empIds) {
      // 직원별 WorkPolicy 조회
      const emp = await this.employeeRepo.findById(companyId, empId);
      const wpId = emp?.workPolicyId;
      const workPolicy = wpId
        ? await this.workPolicyRepo.findById(companyId, wpId)
        : defaultWorkPolicy;

      const workDays = workPolicy?.workDays ?? '1,2,3,4,5';
      const scheduledWorkDays = countWorkDaysInMonth(year, month, workDays);

      // 근태면제 직원: 결근 미생성, all-zero 스냅샷
      if (emp?.attendanceExempt) {
        const existing = await this.salaryAttendanceDataRepo.findByEmployeeAndPeriod(
          companyId, empId, year, month,
        );
        await this.salaryAttendanceDataRepo.create({
          companyId,
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
          confirmedAt: now, confirmedBy,
          version: (existing?.version ?? 0) + 1,
        });
        continue;
      }

      // 해당 월의 기존 근태 레코드
      const attendances = await this.attendanceRepo.findByUserAndMonth(companyId, empId, year, month);
      const attendanceDates = new Set(
        attendances.map((a) => toDateStr(new Date(a.date))),
      );

      // 승인된 휴가 조회
      const approvedLeaves = await this.leaveRequestRepo.findApprovedByPeriod(
        companyId, empId, startDate, endDate,
      );

      // 직원의 1일 소정근로시간
      const dailyWorkMinutes = Math.round(Number(emp?.dailyWorkHours ?? 8) * 60);

      // 휴가가 적용되는 날짜 Set + 유급/무급 분리
      const leaveDates = new Set<string>();
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      let paidLeaveMinutes = 0;

      for (const leave of approvedLeaves) {
        const isPaid = leave.leaveTypeConfig
          ? leave.leaveTypeConfig.deductsFromBalance !== false
          : true;
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
        const dateObj = new Date(year, month - 1, d);
        const dateStr = toDateStr(dateObj);
        const dateUTC = new Date(Date.UTC(year, month - 1, d));

        if (joinDate && dateStr < toDateStr(joinDate)) continue;
        if (resignDate && dateStr > toDateStr(resignDate)) continue;
        if (!isWorkDay(dateObj, workDays)) continue;
        if (holidayDates.has(dateStr)) continue;
        if (attendanceDates.has(dateStr)) continue;

        if (leaveDates.has(dateStr)) {
          await (this.attendanceRepo as unknown as { create(companyId: string, data: Record<string, unknown>): Promise<unknown> }).create(companyId, {
            companyId,
            userId: empId,
            date: dateUTC,
            status: 'LEAVE',
            isHoliday: false,
          });
          continue;
        }

        await (this.attendanceRepo as unknown as { create(companyId: string, data: Record<string, unknown>): Promise<unknown> }).create(companyId, {
          companyId,
          userId: empId,
          date: dateUTC,
          status: 'ABSENT',
          isHoliday: false,
        });
      }

      // 결근 포함된 전체 근태 다시 조회
      const allAttendances = await this.attendanceRepo.findByUserAndMonth(companyId, empId, year, month);

      // ── 현재 근무정책으로 재분류 (threshold/rounding/holiday 소급 적용) ──
      if (workPolicy) {
        const wpInput = {
          startTime: workPolicy.startTime,
          endTime: workPolicy.endTime,
          breakMinutes: workPolicy.breakMinutes,
          workDays,
          lateGraceMinutes: workPolicy.lateGraceMinutes ?? 0,
          earlyLeaveGraceMinutes: workPolicy.earlyLeaveGraceMinutes ?? 0,
          nightWorkStartTime: workPolicy.nightWorkStartTime ?? '22:00',
          nightWorkEndTime: workPolicy.nightWorkEndTime ?? '06:00',
          overtimeThresholdMinutes: workPolicy.overtimeThresholdMinutes ?? 480,
          overtimeMinThreshold: workPolicy.overtimeMinThreshold ?? 0,
          overtimeRoundingMinutes: workPolicy.overtimeRoundingMinutes ?? 0,
          breakType: workPolicy.breakType ?? 'FIXED',
          breakSchedule: workPolicy.breakSchedule ?? null,
          attendanceCalcMode: workPolicy.attendanceCalcMode ?? 'TIME_BASED',
        };

        for (const att of allAttendances) {
          if (!att.checkInTime || !att.checkOutTime) continue;

          const attDate = new Date(att.date);
          const isHoliday = !isWorkDay(attDate, workDays) || holidayDates.has(toDateStr(attDate));

          const result = AttendanceClassifier.classify({
            checkInTime: new Date(att.checkInTime),
            checkOutTime: new Date(att.checkOutTime),
            workPolicy: wpInput,
            isHoliday,
            date: attDate,
          });

          // 재분류 결과가 기존과 다르면 DB 업데이트
          if (
            att.overtimeMinutes !== result.overtimeMinutes ||
            att.regularMinutes !== result.regularMinutes ||
            att.holidayMinutes !== result.holidayMinutes ||
            att.holidayOvertimeMinutes !== result.holidayOvertimeMinutes ||
            att.nightMinutes !== result.nightMinutes ||
            att.nightOvertimeMinutes !== result.nightOvertimeMinutes ||
            att.isHoliday !== isHoliday
          ) {
            await (this.attendanceRepo as unknown as { updateClassification(companyId: string, id: string, data: Record<string, unknown>): Promise<unknown> }).updateClassification(companyId, att.id, {
              status: result.status,
              regularMinutes: result.regularMinutes,
              overtimeMinutes: result.overtimeMinutes,
              nightMinutes: result.nightMinutes,
              nightOvertimeMinutes: result.nightOvertimeMinutes,
              holidayMinutes: result.holidayMinutes,
              holidayOvertimeMinutes: result.holidayOvertimeMinutes,
              holidayNightMinutes: result.holidayNightMinutes,
              holidayNightOvertimeMinutes: result.holidayNightOvertimeMinutes,
              totalMinutes: result.totalMinutes,
              lateMinutes: result.lateMinutes,
              earlyLeaveMinutes: result.earlyLeaveMinutes,
              isHoliday,
            });
            // 로컬 객체도 업데이트 (합산용)
            Object.assign(att, {
              status: result.status,
              regularMinutes: result.regularMinutes,
              overtimeMinutes: result.overtimeMinutes,
              nightMinutes: result.nightMinutes,
              nightOvertimeMinutes: result.nightOvertimeMinutes,
              holidayMinutes: result.holidayMinutes,
              holidayOvertimeMinutes: result.holidayOvertimeMinutes,
              holidayNightMinutes: result.holidayNightMinutes,
              holidayNightOvertimeMinutes: result.holidayNightOvertimeMinutes,
              totalMinutes: result.totalMinutes,
              lateMinutes: result.lateMinutes,
              earlyLeaveMinutes: result.earlyLeaveMinutes,
              isHoliday,
            });
          }
        }
      }

      const existing = await this.salaryAttendanceDataRepo.findByEmployeeAndPeriod(
        companyId, empId, year, month,
      );

      await this.salaryAttendanceDataRepo.create({
        companyId,
        userId: empId,
        year, month,
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
        confirmedBy,
        version: (existing?.version ?? 0) + 1,
      });
    }

    // Mark attendances as confirmed
    await this.attendanceRepo.confirmByDateRange(companyId, empIds, startDate, endDate);

    await this.auditLogRepo.create({
      userId: confirmedBy,
      companyId,
      action: 'CONFIRM',
      entityType: 'Attendance',
      after: { year, month, confirmedCount: empIds.length } as Record<string, unknown>,
    });

    return { confirmedCount: empIds.length };
  }
}
