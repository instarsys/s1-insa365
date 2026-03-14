'use client';

import useSWR from 'swr';
import { fetcher, apiPost, apiDelete } from '@/lib/api';

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  regularMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  totalMinutes: number;
  isConfirmed: boolean;
}

interface DailyAttendanceResponse {
  items: AttendanceRecord[];
  date: string;
  total: number;
}

interface MonthlyAttendanceResponse {
  items: {
    userId: string;
    userName: string;
    departmentName?: string;
    workDays: number;
    actualWorkDays: number;
    totalRegularMinutes: number;
    totalOvertimeMinutes: number;
    totalNightMinutes: number;
    absentDays: number;
    lateDays: number;
  }[];
  year: number;
  month: number;
}

interface OvertimeWeek {
  week: string;
  totalMinutes: number;
  totalHours: number;
  isOverLimit: boolean;
  isWarning: boolean;
}

interface OvertimeEmployeeRaw {
  id: string;
  name: string;
  employeeNumber: string | null;
  department: string | null;
  weeks: OvertimeWeek[];
  hasViolation: boolean;
  hasWarning: boolean;
}

interface OvertimeStatusResponse {
  year: number;
  month: number;
  items: OvertimeEmployeeRaw[];
  violationCount: number;
  warningCount: number;
}

export interface OvertimeStatusItem {
  userId: string;
  userName: string;
  departmentName?: string;
  weeklyHours: number;
  isWarning: boolean;
  isOverLimit: boolean;
  week: string;
}

interface CalendarAttendanceItem {
  userId: string;
  userName: string;
  employeeNumber: string | null;
  departmentName: string | null;
  workDays: number;
  attendances: Record<number, {
    id: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: string;
    isConfirmed: boolean;
    totalMinutes: number;
    note: string | null;
  } | null>;
}

interface CalendarAttendanceResponse {
  year: number;
  month: number;
  daysInMonth: number;
  totalEmployees: number;
  totalPages: number;
  page: number;
  items: CalendarAttendanceItem[];
  dailySummary: Record<number, number>;
}

interface RecordsAttendanceResponse {
  items: (AttendanceRecord & {
    user?: {
      id: string;
      name: string;
      employeeNumber: string | null;
      department?: { name: string } | null;
    };
  })[];
  total: number;
  totalPages: number;
  page: number;
  summary: {
    totalRegularMinutes: number;
    totalOvertimeMinutes: number;
    totalNightMinutes: number;
    totalMinutes: number;
  };
}

export function useDailyAttendance(date: string) {
  const { data, error, isLoading, mutate } = useSWR<DailyAttendanceResponse>(
    `/api/attendance/daily?date=${date}`,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true },
  );

  return { attendance: data?.items ?? [], date: data?.date, total: data?.total ?? 0, isLoading, error, mutate };
}

export function useMonthlyAttendance(year: number, month: number, departmentId?: string) {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (departmentId) params.set('departmentId', departmentId);

  const { data, error, isLoading, mutate } = useSWR<MonthlyAttendanceResponse>(
    `/api/attendance/monthly?${params}`,
    fetcher,
    { revalidateOnFocus: true },
  );

  return { data, isLoading, error, mutate };
}

export function useOvertimeStatus(year?: number, month?: number, departmentId?: string) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? (now.getMonth() + 1);
  const params = new URLSearchParams({ year: String(y), month: String(m) });
  if (departmentId) params.set('departmentId', departmentId);

  const { data, error, isLoading } = useSWR<OvertimeStatusResponse>(
    `/api/attendance/52hour?${params}`,
    fetcher,
    { revalidateOnFocus: true },
  );

  // Flatten: each employee's max weekly hours becomes one item
  // If an employee has multiple weeks, take the one with the highest hours
  const items: OvertimeStatusItem[] = (data?.items ?? []).map((emp) => {
    const maxWeek = emp.weeks.reduce<OvertimeWeek | null>(
      (best, w) => (!best || w.totalHours > best.totalHours ? w : best),
      null,
    );
    return {
      userId: emp.id,
      userName: emp.name,
      departmentName: emp.department ?? undefined,
      weeklyHours: maxWeek?.totalHours ?? 0,
      isWarning: emp.hasWarning,
      isOverLimit: emp.hasViolation,
      week: maxWeek?.week ?? '',
    };
  });

  return {
    items,
    violationCount: data?.violationCount ?? 0,
    warningCount: data?.warningCount ?? 0,
    year: y,
    month: m,
    isLoading,
    error,
  };
}

/** 달력형 뷰용 */
export function useCalendarAttendance(
  year: number,
  month: number,
  departmentId?: string,
  page = 1,
  limit = 50,
  employeeStatus = 'ACTIVE',
) {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    page: String(page),
    limit: String(limit),
    employeeStatus,
  });
  if (departmentId) params.set('departmentId', departmentId);

  const { data, error, isLoading, mutate } = useSWR<CalendarAttendanceResponse>(
    `/api/attendance/calendar?${params}`,
    fetcher,
    { revalidateOnFocus: true },
  );

  return { data, isLoading, error, mutate };
}

/** 목록형 뷰용 (범위 쿼리) */
export function useAttendanceRecords(
  startDate: string,
  endDate: string,
  options?: {
    departmentId?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortKey?: string;
    sortDir?: 'asc' | 'desc';
  },
) {
  const params = new URLSearchParams({ startDate, endDate });
  if (options?.departmentId) params.set('departmentId', options.departmentId);
  if (options?.search) params.set('search', options.search);
  if (options?.status) params.set('status', options.status);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.sortKey) params.set('sortKey', options.sortKey);
  if (options?.sortDir) params.set('sortDir', options.sortDir);

  const { data, error, isLoading, mutate } = useSWR<RecordsAttendanceResponse>(
    `/api/attendance/daily?${params}`,
    fetcher,
    { revalidateOnFocus: true },
  );

  return { data, isLoading, error, mutate };
}

export function useAttendanceMutations() {
  return {
    checkIn: (data: { latitude?: number; longitude?: number }) => apiPost('/api/attendance/check-in', data),
    checkOut: (data: { latitude?: number; longitude?: number }) => apiPost('/api/attendance/check-out', data),
    confirmAttendance: (data: { year: number; month: number }) => apiPost('/api/attendance/confirm', data),
    manualEntry: (data: Record<string, unknown>) => apiPost('/api/attendance/manual', data),
    deleteAttendance: (id: string) => apiDelete(`/api/attendance/${id}`),
  };
}

export type { AttendanceRecord, CalendarAttendanceItem, CalendarAttendanceResponse, RecordsAttendanceResponse };
