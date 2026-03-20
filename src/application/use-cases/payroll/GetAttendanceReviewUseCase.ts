import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { ISalaryAttendanceDataRepository } from '../../ports/ISalaryAttendanceDataRepository';
import type { AttendanceReviewDto } from '../../dtos/payroll';

export interface ILeaveRequestQueryPort {
  findPendingByPeriod(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ id: string; type: string; startDate: Date; endDate: Date; user: { name: string } }[]>;
}

export class GetAttendanceReviewUseCase {
  constructor(
    private employeeRepo: IEmployeeRepository,
    private salaryAttendanceRepo: ISalaryAttendanceDataRepository,
    private leaveRequestRepo?: ILeaveRequestQueryPort,
  ) {}

  async execute(companyId: string, year: number, month: number): Promise<AttendanceReviewDto> {
    // 1. 활성 직원 목록 (limit 크게 잡아서 전체 조회)
    const { items: employees } = await this.employeeRepo.findAll(companyId, {
      status: 'ACTIVE',
      limit: 1000,
    });

    // 2. 해당 월 근태 스냅샷
    const snapshots = await this.salaryAttendanceRepo.findByPeriod(companyId, year, month);
    const confirmedUserIds = new Set(snapshots.map((s) => s.userId));

    // 3. 미확정 직원 추출
    const unconfirmedEmployees = employees
      .filter((e) => !confirmedUserIds.has(e.id))
      .map((e) => ({
        id: e.id,
        name: e.name,
        employeeNumber: e.employeeNumber ?? null,
        departmentName: (e as unknown as Record<string, unknown>).departmentName as string | null ?? null,
      }));

    // 4. 스냅샷 집계
    const summary = {
      totalAbsentDays: 0,
      totalLateDays: 0,
      totalEarlyLeaveDays: 0,
      totalLeaveDays: 0,
      totalOvertimeHours: 0,
      totalNightHours: 0,
      totalHolidayHours: 0,
    };

    for (const snap of snapshots) {
      summary.totalAbsentDays += snap.absentDays;
      summary.totalLateDays += snap.lateDays;
      summary.totalEarlyLeaveDays += snap.earlyLeaveDays;
      summary.totalLeaveDays += snap.leaveDays;
      summary.totalOvertimeHours += Math.round((snap.totalOvertimeMinutes / 60) * 10) / 10;
      summary.totalNightHours += Math.round((snap.totalNightMinutes / 60) * 10) / 10;
      summary.totalHolidayHours += Math.round((snap.totalHolidayMinutes / 60) * 10) / 10;
    }

    // 소수점 1자리 반올림
    summary.totalOvertimeHours = Math.round(summary.totalOvertimeHours * 10) / 10;
    summary.totalNightHours = Math.round(summary.totalNightHours * 10) / 10;
    summary.totalHolidayHours = Math.round(summary.totalHolidayHours * 10) / 10;

    // 5. 미처리 휴가 조회
    let pendingLeaveRequests: { id: string; employeeName: string; leaveType: string; startDate: string; endDate: string }[] = [];
    if (this.leaveRequestRepo) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));
      const pending = await this.leaveRequestRepo.findPendingByPeriod(companyId, startDate, endDate);
      pendingLeaveRequests = pending.map((p) => ({
        id: p.id,
        employeeName: p.user.name,
        leaveType: p.type,
        startDate: p.startDate.toISOString().slice(0, 10),
        endDate: p.endDate.toISOString().slice(0, 10),
      }));
    }

    return {
      activeEmployeeCount: employees.length,
      confirmedCount: snapshots.length,
      unconfirmedEmployees,
      summary,
      pendingLeaveRequests,
    };
  }
}
