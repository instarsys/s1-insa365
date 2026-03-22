import type { DailyAttendanceDto, MonthlyAttendanceSummaryDto, AttendanceRecordDto } from '../dtos/attendance';

export interface CreateAttendanceData {
  companyId: string;
  userId: string;
  date: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  latitude?: number;
  longitude?: number;
  checkInLatitude?: number;
  checkInLongitude?: number;
  isOutOfRange?: boolean;
  checkInLocationName?: string;
  checkInDistance?: number;
  status?: string;
  isHoliday?: boolean;
}

export interface UpdateAttendanceData {
  checkInTime?: Date;
  checkOutTime?: Date;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  isOutOfRange?: boolean;
  checkInLocationName?: string;
  checkOutLocationName?: string;
  checkInDistance?: number;
  checkOutDistance?: number;
  status?: string;
  regularMinutes?: number;
  overtimeMinutes?: number;
  nightMinutes?: number;
  nightOvertimeMinutes?: number;
  holidayMinutes?: number;
  holidayOvertimeMinutes?: number;
  holidayNightMinutes?: number;
  holidayNightOvertimeMinutes?: number;
  totalMinutes?: number;
  note?: string;
}

export interface IAttendanceRepository {
  findByDate(companyId: string, userId: string, date: Date): Promise<DailyAttendanceDto | null>;
  findDailyAll(companyId: string, date: Date, departmentId?: string): Promise<DailyAttendanceDto[]>;
  findMonthly(companyId: string, year: number, month: number, departmentId?: string): Promise<MonthlyAttendanceSummaryDto[]>;
  create(data: CreateAttendanceData): Promise<DailyAttendanceDto>;
  update(id: string, data: UpdateAttendanceData): Promise<DailyAttendanceDto>;
  confirmMonth(companyId: string, year: number, month: number, confirmedBy: string): Promise<void>;
  getWeeklyHours(companyId: string, userId: string, weekStartDate: Date): Promise<number>;
  isMonthConfirmed(companyId: string, year: number, month: number): Promise<boolean>;
  findByUserAndMonth(companyId: string, userId: string, year: number, month: number): Promise<AttendanceRecordDto[]>;
  confirmByDateRange(companyId: string, userIds: string[], startDate: Date, endDate: Date): Promise<number>;
  deleteAutoAbsentByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<number>;
  unconfirmByDateRange(companyId: string, startDate: Date, endDate: Date): Promise<number>;
}
