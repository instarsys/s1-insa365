import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { IAttendanceRepository } from '../../ports/IAttendanceRepository';

export interface DashboardWidgets {
  employeeCount: number;
  todayAttendanceCount: number;
  currentMonthPayroll: {
    totalPay: number;
    totalNetPay: number;
    status: string;
  } | null;
  previousMonthPayroll: {
    totalPay: number;
    totalNetPay: number;
  } | null;
}

export class GetDashboardWidgetsUseCase {
  constructor(
    private employeeRepo: IEmployeeRepository,
    private salaryCalcRepo: ISalaryCalculationRepository,
    private attendanceRepo: IAttendanceRepository,
  ) {}

  async execute(companyId: string): Promise<DashboardWidgets> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Employee count
    const employeeCount = await this.employeeRepo.countByStatus(companyId, 'ACTIVE');

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await this.attendanceRepo.findDailyAll(companyId, today);
    const todayAttendanceCount = todayAttendance.filter((a) => a.checkInTime !== null).length;

    // Current month payroll
    const currentSummary = await this.salaryCalcRepo.getSummary(companyId, year, month);

    // Previous month payroll
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    const prevSummary = await this.salaryCalcRepo.getSummary(companyId, prevYear, prevMonth);

    return {
      employeeCount,
      todayAttendanceCount,
      currentMonthPayroll: currentSummary
        ? {
            totalPay: currentSummary.totalPay,
            totalNetPay: currentSummary.totalNetPay,
            status: currentSummary.status,
          }
        : null,
      previousMonthPayroll: prevSummary
        ? {
            totalPay: prevSummary.totalPay,
            totalNetPay: prevSummary.totalNetPay,
          }
        : null,
    };
  }
}
