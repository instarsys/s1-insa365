'use client';

import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api';

export interface PayslipEmailHistoryItem {
  id: string;
  userId: string;
  userName: string;
  employeeNumber: string;
  departmentName: string;
  recipientEmail: string;
  status: 'PENDING' | 'SENT' | 'OPENED' | 'FAILED';
  sentAt: string | null;
  openedAt: string | null;
  failReason: string | null;
  createdAt: string;
}

interface SendEmailResult {
  sentCount: number;
  failedCount: number;
  results: { userId: string; success: boolean; error?: string }[];
}

export function usePayslipEmailHistory(year: number, month: number) {
  const { data, error, isLoading, mutate } = useSWR<{ items: PayslipEmailHistoryItem[] }>(
    `/api/payroll/payslips/email/history?year=${year}&month=${month}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 30000 },
  );

  return { history: data?.items ?? [], isLoading, error, mutate };
}

export function usePayslipEmailMutations() {
  return {
    sendEmails: (data: { year: number; month: number; userIds: string[] }) =>
      apiPost<SendEmailResult>('/api/payroll/payslips/email', data),
  };
}
