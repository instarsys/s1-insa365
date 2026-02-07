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
