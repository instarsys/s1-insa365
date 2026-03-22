import useSWR from 'swr';
import { fetcher, apiPost, apiPut, apiDelete } from '@/lib/api';

interface PayrollGroup {
  id: string;
  name: string;
  code: string | null;
  payDay: number;
  description: string | null;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  _count: { users: number };
  payrollGroupManagers: Array<{
    user: { id: string; name: string; email: string };
  }>;
  [key: string]: unknown;
}

interface PayrollGroupMember {
  id: string;
  name: string;
  email: string;
  employeeNumber: string | null;
  department: { name: string } | null;
  [key: string]: unknown;
}

export function usePayrollGroups() {
  const { data, error, isLoading, mutate } = useSWR<{ items: PayrollGroup[] }>(
    '/api/settings/payroll-groups',
    fetcher,
  );
  return {
    groups: data?.items ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function usePayrollGroupMembers(groupId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ items: PayrollGroupMember[] }>(
    groupId ? `/api/settings/payroll-groups/${groupId}/members` : null,
    fetcher,
  );
  return {
    members: data?.items ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function usePayrollGroupMutations() {
  return {
    createGroup: (data: { name: string; code?: string; payDay?: number; description?: string }) =>
      apiPost('/api/settings/payroll-groups', data),
    updateGroup: (id: string, data: Partial<PayrollGroup>) =>
      apiPut(`/api/settings/payroll-groups/${id}`, data),
    deleteGroup: (id: string) =>
      apiDelete(`/api/settings/payroll-groups/${id}`),
    assignMembers: (groupId: string, userIds: string[]) =>
      apiPost(`/api/settings/payroll-groups/${groupId}/members`, { action: 'assign', userIds }),
    unassignMembers: (groupId: string, userIds: string[]) =>
      apiPost(`/api/settings/payroll-groups/${groupId}/members`, { action: 'unassign', userIds }),
    addManager: (groupId: string, userId: string) =>
      apiPost(`/api/settings/payroll-groups/${groupId}/members`, { action: 'addManager', userId }),
    removeManager: (groupId: string, userId: string) =>
      apiPost(`/api/settings/payroll-groups/${groupId}/members`, { action: 'removeManager', userId }),
  };
}
