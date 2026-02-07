export interface SalaryAttendanceDataDto {
  id: string;
  companyId: string;
  userId: string;
  year: number;
  month: number;
  workDays: number;
  actualWorkDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  leaveDays: number;
  totalRegularMinutes: number;
  totalOvertimeMinutes: number;
  totalNightMinutes: number;
  totalNightOvertimeMinutes: number;
  totalHolidayMinutes: number;
  totalHolidayOvertimeMinutes: number;
  totalHolidayNightMinutes: number;
  totalHolidayNightOvertimeMinutes: number;
  confirmedAt: string;
  confirmedBy: string;
  version: number;
}

export interface CreateSalaryAttendanceData {
  companyId: string;
  userId: string;
  year: number;
  month: number;
  workDays: number;
  actualWorkDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  leaveDays: number;
  totalRegularMinutes: number;
  totalOvertimeMinutes: number;
  totalNightMinutes: number;
  totalNightOvertimeMinutes: number;
  totalHolidayMinutes: number;
  totalHolidayOvertimeMinutes: number;
  totalHolidayNightMinutes: number;
  totalHolidayNightOvertimeMinutes: number;
  confirmedAt: Date;
  confirmedBy: string;
}

export interface ISalaryAttendanceDataRepository {
  findByEmployeeAndPeriod(companyId: string, userId: string, year: number, month: number): Promise<SalaryAttendanceDataDto | null>;
  findByPeriod(companyId: string, year: number, month: number): Promise<SalaryAttendanceDataDto[]>;
  create(data: CreateSalaryAttendanceData): Promise<SalaryAttendanceDataDto>;
  createMany(data: CreateSalaryAttendanceData[]): Promise<number>;
}
