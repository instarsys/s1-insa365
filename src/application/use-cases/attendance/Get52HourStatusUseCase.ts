import type { IAttendanceRepository } from '../../ports/IAttendanceRepository';
import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { WeeklyHoursDto } from '../../dtos/attendance';

const WEEKLY_LIMIT = 52;
const WARNING_THRESHOLD = 48;

export class Get52HourStatusUseCase {
  constructor(
    private attendanceRepo: IAttendanceRepository,
    private employeeRepo: IEmployeeRepository,
  ) {}

  async execute(companyId: string, weekStartDate: string, departmentId?: string): Promise<WeeklyHoursDto[]> {
    const employees = await this.employeeRepo.findAll(companyId, {
      status: 'ACTIVE',
      departmentId,
      page: 1,
      limit: 1000,
    });

    const startDate = new Date(weekStartDate);
    const results: WeeklyHoursDto[] = [];

    for (const emp of employees.items) {
      const totalMinutes = await this.attendanceRepo.getWeeklyHours(companyId, emp.id, startDate);
      const totalHours = totalMinutes / 60;
      const regularHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(totalHours - 40, 0);

      let warningLevel: 'NORMAL' | 'WARNING' | 'EXCEEDED' = 'NORMAL';
      if (totalHours >= WEEKLY_LIMIT) {
        warningLevel = 'EXCEEDED';
      } else if (totalHours >= WARNING_THRESHOLD) {
        warningLevel = 'WARNING';
      }

      results.push({
        userId: emp.id,
        userName: emp.name,
        weekStartDate,
        totalHours: Math.round(totalHours * 100) / 100,
        regularHours: Math.round(regularHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        warningLevel,
      });
    }

    return results;
  }
}
