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
  totalHolidayMinutes: number;
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
