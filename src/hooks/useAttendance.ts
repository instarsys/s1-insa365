'use client';

import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api';

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

interface OvertimeStatusResponse {
  items: {
    userId: string;
    userName: string;
    departmentName?: string;
    weeklyHours: number;
    isWarning: boolean;
    isOverLimit: boolean;
  }[];
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

export function useOvertimeStatus() {
  const { data, error, isLoading } = useSWR<OvertimeStatusResponse>(
    '/api/attendance/52hour',
    fetcher,
    { revalidateOnFocus: true },
  );

  return { items: data?.items ?? [], isLoading, error };
}

export function useAttendanceMutations() {
  return {
    checkIn: (data: { latitude?: number; longitude?: number }) => apiPost('/api/attendance/check-in', data),
    checkOut: (data: { latitude?: number; longitude?: number }) => apiPost('/api/attendance/check-out', data),
    confirmAttendance: (data: { year: number; month: number }) => apiPost('/api/attendance/confirm', data),
    manualEntry: (data: Record<string, unknown>) => apiPost('/api/attendance/manual', data),
  };
}
