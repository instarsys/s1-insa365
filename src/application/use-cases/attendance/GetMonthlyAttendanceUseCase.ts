import type { IAttendanceRepository } from '../../ports/IAttendanceRepository';
import type { MonthlyAttendanceSummaryDto } from '../../dtos/attendance';

export class GetMonthlyAttendanceUseCase {
  constructor(private attendanceRepo: IAttendanceRepository) {}

  async execute(companyId: string, year: number, month: number, departmentId?: string): Promise<MonthlyAttendanceSummaryDto[]> {
    return this.attendanceRepo.findMonthly(companyId, year, month, departmentId);
  }
}
