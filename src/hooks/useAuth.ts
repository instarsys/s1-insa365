'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { apiPost, fetcher } from '@/lib/api';

const AUTH_PAGES = ['/login', '/signup', '/join', '/super-admin/login', '/change-password'];

interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'SYSTEM_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';
  employeeNumber?: string;
  canViewSensitive: boolean;
  mustChangePassword?: boolean;
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
  employeeCountRange?: string;
  name: string;
  email: string;
  password: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed?: boolean;
}

export function useAuth() {
  const pathname = usePathname();
  const swrKey = AUTH_PAGES.includes(pathname) ? null : '/api/auth/me';

  const { data: user, error, mutate, isLoading } = useSWR<User>(swrKey, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    errorRetryCount: 0,
  });

  const login = useCallback(async (input: LoginInput) => {
    const result = await apiPost<{ user: User }>('/api/auth/login', input);
    await globalMutate('/api/auth/me', result.user, { revalidate: true });
    return result;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const result = await apiPost<{ user: User }>('/api/auth/signup', input);
    await globalMutate('/api/auth/me', result.user, { revalidate: true });
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost('/api/auth/logout');
    } catch {
      // 로그아웃 API 실패해도 리다이렉트 진행
    }
    await globalMutate('/api/auth/me', undefined, { revalidate: false });
    window.location.href = '/login';
  }, []);

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
