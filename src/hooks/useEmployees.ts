'use client';

import useSWR from 'swr';
import { fetcher, apiPost, apiPut, apiDelete } from '@/lib/api';

interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  employeeStatus: string;
  departmentId?: string;
  departmentName?: string;
  positionId?: string;
  positionName?: string;
  joinDate?: string;
  resignDate?: string;
  resignReason?: string;
  dependents: number;
  bankName?: string;
  hasBankAccount: boolean;
  address?: string;
  isHouseholder: boolean;
  hireType?: string;
  profileImageUrl?: string;
}

interface EmployeeListResponse {
  items: Employee[];
  total: number;
  page: number;
  limit: number;
}

interface EmployeeFilters {
  search?: string;
  departmentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useEmployees(filters?: EmployeeFilters) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.departmentId) params.set('departmentId', filters.departmentId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const queryString = params.toString();
  const url = queryString ? `/api/employees?${queryString}` : '/api/employees';

  const { data, error, isLoading, mutate } = useSWR<EmployeeListResponse>(url, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  return {
    employees: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    isLoading,
    error,
    mutate,
  };
}

export function useEmployee(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/employees/${id}` : null,
    fetcher,
    { revalidateOnFocus: true },
  );

  return { employee: data, isLoading, error, mutate };
}

export function useEmployeeMutations() {
  return {
    createEmployee: (data: Record<string, unknown>) => apiPost('/api/employees', data),
    updateEmployee: (id: string, data: Record<string, unknown>) => apiPut(`/api/employees/${id}`, data),
    deleteEmployee: (id: string) => apiDelete(`/api/employees/${id}`),
  };
}

interface PiiResponse {
  field: string;
  value: string | null;
}

export function useEmployeePii(employeeId: string, field: string, enabled: boolean) {
  const { data, error, isLoading } = useSWR<PiiResponse>(
    enabled ? `/api/employees/${employeeId}/pii?field=${field}` : null,
    fetcher,
    { revalidateOnFocus: false, errorRetryCount: 0 },
  );

  return { value: data?.value ?? null, isLoading, error };
}
