/**
 * Attendance-related DTOs.
 */

export interface RecordAttendanceDto {
  userId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  latitude?: number;
  longitude?: number;
}

export interface ConfirmAttendanceDto {
  year: number;
  month: number;
  userIds?: string[];
  payrollGroupId?: string;
  departmentId?: string;
}

export interface DailyAttendanceDto {
  id: string;
  userId: string;
  userName: string;
  employeeNumber: string | null;
  departmentName: string | null;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  regularMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  totalMinutes: number;
  isHoliday: boolean;
  isConfirmed: boolean;
  note: string | null;
}

export interface MonthlyAttendanceSummaryDto {
  userId: string;
  userName: string;
  employeeNumber: string | null;
  departmentName: string | null;
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
  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  isConfirmed: boolean;
}

export interface WeeklyHoursDto {
  userId: string;
  userName: string;
  weekStartDate: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  warningLevel: 'NORMAL' | 'WARNING' | 'EXCEEDED';
}

export interface UpdateAttendanceDto {
  checkInTime?: string;
  checkOutTime?: string;
  status?: string;
  note?: string;
}

export interface BatchManualAttendanceDto {
  userId: string;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime?: string;
  status?: string;
  isHoliday?: boolean;
  note?: string;
  isConfirmed?: boolean;
  excludeWeekends: boolean;
  excludeHolidays: boolean;
}

export interface BatchManualAttendanceResultDto {
  totalRequested: number;
  totalCreated: number;
  totalSkipped: number;
  created: { date: string }[];
  skipped: { date: string; reason: string }[];
}

/** 근태 확정 시 스냅샷 생성에 필요한 전체 시간 필드 */
export interface AttendanceRecordDto {
  id: string;
  userId: string;
  date: Date;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  totalMinutes: number;
  status: string;
  regularMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  nightOvertimeMinutes: number;
  holidayMinutes: number;
  holidayOvertimeMinutes: number;
  holidayNightMinutes: number;
  holidayNightOvertimeMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  isHoliday: boolean;
}

export interface GpsValidationResultDto {
  isWithinRange: boolean;
  nearestLocation: { id: string; name: string; distance: number } | null;
  enforcement: string;
  allowed: boolean;
  warningMessage?: string;
}

export interface CheckInResultDto {
  attendance: DailyAttendanceDto;
  gpsValidation?: GpsValidationResultDto;
}

export interface CheckOutResultDto {
  attendance: DailyAttendanceDto;
  gpsValidation?: GpsValidationResultDto;
}
