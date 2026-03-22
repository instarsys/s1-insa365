'use client';

import useSWR from 'swr';
import { fetcher, apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  departmentName?: string;
  type: string;
  leaveTypeConfigId?: string;
  leaveTypeConfig?: { id: string; code: string; name: string; leaveGroup?: { name: string } };
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: string;
  approvedBy?: string;
  createdAt: string;
}

export interface LeaveGroupItem {
  id: string;
  name: string;
  allowOveruse: boolean;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  _count?: { leaveTypeConfigs: number };
  [key: string]: unknown;
}

export interface LeaveTypeConfigItem {
  id: string;
  code: string;
  name: string;
  leaveGroupId?: string;
  leaveGroup?: { name: string };
  timeOption: string;
  paidHours: number;
  deductionDays: number;
  deductsFromBalance: boolean;
  requiresApproval: boolean;
  maxConsecutiveDays?: number;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  [key: string]: unknown;
}

export interface LeaveAccrualRuleItem {
  id: string;
  name: string;
  leaveGroupId: string;
  leaveGroup?: { name: string };
  accrualBasis: string;
  accrualUnit: string;
  proRataFirstYear: boolean;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  tiers: AccrualTierItem[];
  [key: string]: unknown;
}

export interface AccrualTierItem {
  id: string;
  serviceMonthFrom: number;
  serviceMonthTo: number;
  accrualDays: number;
  validMonths?: number;
  sortOrder: number;
}

export interface LeaveAccrualItem {
  userId: string;
  userName: string;
  departmentName: string | null;
  joinDate: string;
  records: {
    leaveTypeName: string;
    accrualDays: number;
    usedDays: number;
    remainingDays: number;
    periodStart: string;
    periodEnd: string;
    source: string;
  }[];
  totalAccrualDays: number;
  totalUsedDays: number;
  totalRemainingDays: number;
  [key: string]: unknown;
}

interface LeaveBalance {
  userId: string;
  userName: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export function useLeaveRequests(filters?: { status?: string; userId?: string; type?: string; departmentId?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.userId) params.set('userId', filters.userId);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.departmentId) params.set('departmentId', filters.departmentId);

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

  const { data, error, isLoading, mutate } = useSWR<LeaveBalance>(
    url,
    fetcher,
    { revalidateOnFocus: true },
  );

  return { balance: data, isLoading, error, mutate };
}

export interface LeaveBalanceSummary {
  userId: string;
  userName: string;
  departmentName: string | null;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export function useLeaveBalances() {
  const { data, error, isLoading, mutate } = useSWR<{ items: LeaveBalanceSummary[] }>(
    '/api/leave/balances',
    fetcher,
    { revalidateOnFocus: true },
  );
  return { balances: data?.items ?? [], isLoading, error, mutate };
}

export function useLeaveMutations() {
  return {
    createRequest: (data: { type: string; leaveTypeConfigId?: string; startDate: string; endDate: string; days?: number; reason?: string }) =>
      apiPost('/api/leave/request', data),
    approve: (id: string, days?: number) => apiPut(`/api/leave/request/${id}/approve`, days !== undefined ? { days } : {}),
    reject: (id: string, data: { reason: string }) => apiPut(`/api/leave/request/${id}/reject`, data),
    updateBalance: (userId: string, data: { year: number; totalDays: number }) =>
      apiPut(`/api/leave/balance/${userId}`, data),
    adjustBalance: (data: { userId: string; year: number; days: number; reason: string; leaveTypeConfigId: string }) =>
      apiPost('/api/leave/accrual-records/manual', data),
    grantLeave: (data: {
      userId: string; leaveTypeConfigId: string;
      startDate: string; endDate: string; days: number; reason?: string;
    }) => apiPost('/api/leave/grant', data),
    updateRequest: (id: string, data: Record<string, unknown>) =>
      apiPut(`/api/leave/request/${id}`, data),
    deleteRequest: (id: string) => apiDelete(`/api/leave/request/${id}`),
  };
}

// ──────────────────────────────────────────────
// 연차 원장
// ──────────────────────────────────────────────

export interface LedgerEntry {
  date: string;
  type: 'ACCRUAL' | 'USAGE' | 'ADJUSTMENT' | 'CARRY_OVER';
  days: number;
  runningBalance: number;
  description: string;
  source: string;
  referenceId?: string;
}

export function useLeaveLedger(userId?: string, year?: number) {
  const resolvedYear = year ?? new Date().getFullYear();
  const url = userId ? `/api/leave/ledger?userId=${userId}&year=${resolvedYear}` : null;
  const { data, error, isLoading, mutate } = useSWR<{ items: LedgerEntry[] }>(url, fetcher);
  return { entries: data?.items ?? [], isLoading, error, mutate };
}

// ──────────────────────────────────────────────
// 설정: 휴가 그룹
// ──────────────────────────────────────────────

export function useLeaveGroups() {
  const { data, error, isLoading, mutate } = useSWR<{ items: LeaveGroupItem[] }>(
    '/api/settings/leave-groups',
    fetcher,
    { revalidateOnFocus: true },
  );
  return { groups: data?.items ?? [], isLoading, error, mutate };
}

export function useLeaveGroupMutations() {
  return {
    create: (data: { name: string; allowOveruse?: boolean; description?: string; sortOrder?: number }) =>
      apiPost('/api/settings/leave-groups', data),
    update: (id: string, data: { name?: string; allowOveruse?: boolean; description?: string; sortOrder?: number }) =>
      apiPut(`/api/settings/leave-groups/${id}`, data),
    remove: (id: string) => apiDelete(`/api/settings/leave-groups/${id}`),
  };
}

// ──────────────────────────────────────────────
// 설정: 휴가 유형
// ──────────────────────────────────────────────

export function useLeaveTypeConfigs() {
  const { data, error, isLoading, mutate } = useSWR<{ items: LeaveTypeConfigItem[] }>(
    '/api/settings/leave-types',
    fetcher,
    { revalidateOnFocus: true },
  );
  return { typeConfigs: data?.items ?? [], isLoading, error, mutate };
}

export function useLeaveTypeConfigMutations() {
  return {
    create: (data: Partial<LeaveTypeConfigItem>) =>
      apiPost('/api/settings/leave-types', data),
    update: (id: string, data: Partial<LeaveTypeConfigItem>) =>
      apiPut(`/api/settings/leave-types/${id}`, data),
    remove: (id: string) => apiDelete(`/api/settings/leave-types/${id}`),
  };
}

// ──────────────────────────────────────────────
// 설정: 발생 규칙
// ──────────────────────────────────────────────

export function useLeaveAccrualRules() {
  const { data, error, isLoading, mutate } = useSWR<{ items: LeaveAccrualRuleItem[] }>(
    '/api/settings/leave-accrual-rules',
    fetcher,
    { revalidateOnFocus: true },
  );
  return { rules: data?.items ?? [], isLoading, error, mutate };
}

export function useLeaveAccrualRuleMutations() {
  return {
    create: (data: { name: string; leaveGroupId: string; accrualBasis: string; accrualUnit: string; proRataFirstYear?: boolean; description?: string; tiers: Omit<AccrualTierItem, 'id'>[] }) =>
      apiPost('/api/settings/leave-accrual-rules', data),
    update: (id: string, data: { name?: string; leaveGroupId?: string; accrualBasis?: string; accrualUnit?: string; proRataFirstYear?: boolean; description?: string; tiers?: Omit<AccrualTierItem, 'id'>[] }) =>
      apiPut(`/api/settings/leave-accrual-rules/${id}`, data),
    remove: (id: string) => apiDelete(`/api/settings/leave-accrual-rules/${id}`),
  };
}

// ──────────────────────────────────────────────
// 발생 현황
// ──────────────────────────────────────────────

export function useLeaveAccruals(filters?: { year?: number; departmentId?: string }) {
  const params = new URLSearchParams();
  if (filters?.year) params.set('year', String(filters.year));
  if (filters?.departmentId) params.set('departmentId', filters.departmentId);

  const queryString = params.toString();
  const url = queryString ? `/api/leave/accruals?${queryString}` : '/api/leave/accruals';

  const { data, error, isLoading, mutate } = useSWR<{ items: LeaveAccrualItem[] }>(
    url,
    fetcher,
    { revalidateOnFocus: true },
  );
  return { accruals: data?.items ?? [], isLoading, error, mutate };
}

export function useLeaveAccrualGenerate() {
  return {
    generate: (data: { year: number; ruleId?: string }) =>
      apiPost<{ generated: number; skipped: number }>('/api/leave/accruals/generate', data),
  };
}

// ──────────────────────────────────────────────
// 휴가 내역 (3뷰)
// ──────────────────────────────────────────────

export function useLeaveHistory(filters?: { view?: string; year?: number; departmentId?: string }) {
  const params = new URLSearchParams();
  if (filters?.view) params.set('view', filters.view);
  if (filters?.year) params.set('year', String(filters.year));
  if (filters?.departmentId) params.set('departmentId', filters.departmentId);

  const queryString = params.toString();
  const url = queryString ? `/api/leave/history?${queryString}` : '/api/leave/history';

  const { data, error, isLoading, mutate } = useSWR(
    url,
    fetcher,
    { revalidateOnFocus: true },
  );
  return { data, isLoading, error, mutate };
}
