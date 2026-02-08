'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { apiPost, fetcher } from '@/lib/api';

interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';
  employeeNumber?: string;
  canViewSensitive: boolean;
  companyName?: string;
  departmentName?: string | null;
  positionName?: string | null;
  joinDate?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface SignupInput {
  companyName: string;
  businessNumber: string;
  representativeName: string;
  name: string;
  email: string;
  password: string;
}

export function useAuth() {
  const { data: user, error, mutate, isLoading } = useSWR<User>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    errorRetryCount: 0,
  });

  const login = useCallback(async (input: LoginInput) => {
    const result = await apiPost<{ user: User }>('/api/auth/login', input);
    await mutate(result.user, false);
    return result;
  }, [mutate]);

  const signup = useCallback(async (input: SignupInput) => {
    const result = await apiPost<{ user: User }>('/api/auth/signup', input);
    await mutate(result.user, false);
    return result;
  }, [mutate]);

  const logout = useCallback(async () => {
    await apiPost('/api/auth/logout');
    await mutate(undefined, false);
    window.location.href = '/login';
  }, [mutate]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    login,
    signup,
    logout,
    mutate,
  };
}
