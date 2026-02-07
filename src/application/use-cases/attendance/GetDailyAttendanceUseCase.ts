import type { IAttendanceRepository } from '../../ports/IAttendanceRepository';
import type { DailyAttendanceDto } from '../../dtos/attendance';

export class GetDailyAttendanceUseCase {
  constructor(private attendanceRepo: IAttendanceRepository) {}

  async execute(companyId: string, date: string, departmentId?: string): Promise<DailyAttendanceDto[]> {
    return this.attendanceRepo.findDailyAll(companyId, new Date(date), departmentId);
  }
}
