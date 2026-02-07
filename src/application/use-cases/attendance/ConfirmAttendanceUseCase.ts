import type { IAttendanceRepository } from '../../ports/IAttendanceRepository';
import type { ISalaryAttendanceDataRepository } from '../../ports/ISalaryAttendanceDataRepository';
import type { ConfirmAttendanceDto } from '../../dtos/attendance';
import { ValidationError } from '@domain/errors';

export class ConfirmAttendanceUseCase {
  constructor(
    private attendanceRepo: IAttendanceRepository,
    private salaryAttendanceDataRepo: ISalaryAttendanceDataRepository,
  ) {}

  async execute(companyId: string, dto: ConfirmAttendanceDto, confirmedBy: string): Promise<void> {
    // Check if already confirmed
    const alreadyConfirmed = await this.attendanceRepo.isMonthConfirmed(companyId, dto.year, dto.month);
    if (alreadyConfirmed) {
      throw new ValidationError('Attendance for this month is already confirmed');
    }

    // Get monthly attendance summaries
    const summaries = await this.attendanceRepo.findMonthly(companyId, dto.year, dto.month, dto.departmentId);

    // Mark attendance as confirmed
    await this.attendanceRepo.confirmMonth(companyId, dto.year, dto.month, confirmedBy);

    // Create SalaryAttendanceData snapshots for each employee
    const snapshots = summaries.map((s) => ({
      companyId,
      userId: s.userId,
      year: dto.year,
      month: dto.month,
      workDays: s.workDays,
      actualWorkDays: s.actualWorkDays,
      absentDays: s.absentDays,
      lateDays: s.lateDays,
      earlyLeaveDays: s.earlyLeaveDays,
      leaveDays: s.leaveDays,
      totalRegularMinutes: s.totalRegularMinutes,
      totalOvertimeMinutes: s.totalOvertimeMinutes,
      totalNightMinutes: s.totalNightMinutes,
      totalNightOvertimeMinutes: 0,
      totalHolidayMinutes: s.totalHolidayMinutes,
      totalHolidayOvertimeMinutes: 0,
      totalHolidayNightMinutes: 0,
      totalHolidayNightOvertimeMinutes: 0,
      confirmedAt: new Date(),
      confirmedBy,
    }));

    if (snapshots.length > 0) {
      await this.salaryAttendanceDataRepo.createMany(snapshots);
    }
  }
}
