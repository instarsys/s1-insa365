'use client';

import useSWR from 'swr';
import { fetcher, apiPost, apiPut } from '@/lib/api';

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  departmentName?: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: string;
  approvedBy?: string;
  createdAt: string;
}

interface LeaveBalance {
  userId: string;
  userName: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export function useLeaveRequests(filters?: { status?: string; userId?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.userId) params.set('userId', filters.userId);

  const queryString = params.toString();
  const url = queryString ? `/api/leave/requests?${queryString}` : '/api/leave/requests';

  const { data, error, isLoading, mutate } = useSWR<{ items: LeaveRequest[] }>(
    url,
    fetcher,
    { revalidateOnFocus: true },
  );

  return { requests: data?.items ?? [], isLoading, error, mutate };
}

export function useLeaveBalance(userId?: string) {
  const url = userId ? `/api/leave/balance?userId=${userId}` : '/api/leave/balance';

  const { data, error, isLoading } = useSWR<LeaveBalance>(
    url,
    fetcher,
    { revalidateOnFocus: true },
  );

  return { balance: data, isLoading, error };
}

export function useLeaveMutations() {
  return {
    createRequest: (data: { type: string; startDate: string; endDate: string; days: number; reason?: string }) =>
      apiPost('/api/leave/request', data),
    approve: (id: string) => apiPut(`/api/leave/request/${id}/approve`),
    reject: (id: string, data: { reason: string }) => apiPut(`/api/leave/request/${id}/reject`, data),
    updateBalance: (userId: string, data: { year: number; totalDays: number }) =>
      apiPut(`/api/leave/balance/${userId}`, data),
  };
}
