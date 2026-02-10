'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';

interface TodoItem {
  id: string;
  type: 'PAYROLL_DEADLINE' | 'UNCONFIRMED_ATTENDANCE' | 'OVERTIME_WARNING' | 'PENDING_LEAVE';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  link: string;
  dueDate?: string;
}

interface DashboardWidgets {
  totalEmployees: number;
  monthlyPayroll: number;
  todayAttendance: {
    present: number;
    absent: number;
    late: number;
    leave: number;
    total: number;
  };
  overtimeWarnings: number;
  pendingLeaves: number;
}

export function useDashboardTodos() {
  const { data, error, isLoading } = useSWR<{ items: TodoItem[] }>(
    '/api/dashboard/todos',
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true },
  );

  return { todos: data?.items ?? [], isLoading, error };
}

export function useDashboardWidgets() {
  const { data, error, isLoading } = useSWR<DashboardWidgets>(
    '/api/dashboard/widgets',
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true },
  );

  return { widgets: data, isLoading, error };
}

// ─── 대시보드 5위젯 훅 ─────────────────

interface MissingCheckout {
  id: string;
  date: string;
  checkInTime: string;
  user: { id: string; name: string; employeeNumber: string | null; department: { name: string } | null };
}

export function useAttendanceMissing() {
  const { data, error, isLoading } = useSWR<{ items: MissingCheckout[] }>(
    '/api/dashboard/attendance-missing',
    fetcher,
    { refreshInterval: 60000 },
  );
  return { items: data?.items ?? [], isLoading, error };
}

interface Announcement {
  id: string;
  category: string;
  title: string;
  content: string | null;
  isNew: boolean;
  publishedAt: string;
}

export function useAnnouncements() {
  const { data, error, isLoading } = useSWR<{ items: Announcement[] }>(
    '/api/dashboard/announcements',
    fetcher,
    { refreshInterval: 300000 },
  );
  return { items: data?.items ?? [], isLoading, error };
}

interface EmployeeAlerts {
  resigningSoon: number;
  noLocation: number;
  onLeave: number;
  total: number;
}

export function useEmployeeAlerts() {
  const { data, error, isLoading } = useSWR<EmployeeAlerts>(
    '/api/dashboard/employee-alerts',
    fetcher,
    { refreshInterval: 300000 },
  );
  return { alerts: data, isLoading, error };
}

interface LeaveStatusItem {
  id: string;
  year: number;
  totalDays: string;
  usedDays: string;
  remainingDays: string;
  user: { id: string; name: string; department: { name: string } | null };
}

export function useLeaveStatus() {
  const { data, error, isLoading } = useSWR<{ items: LeaveStatusItem[] }>(
    '/api/dashboard/leave-status',
    fetcher,
    { refreshInterval: 300000 },
  );
  return { items: data?.items ?? [], isLoading, error };
}
