'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // 1단계: 인증 실패 → 로그인 리다이렉트
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // 2단계: 임시비밀번호 강제 변경
    if (user?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [isLoading, isAuthenticated, user?.mustChangePassword, router]);

  // 로딩 중 또는 미인증: children 렌더링 차단
  if (isLoading || !isAuthenticated) return null;

  // 비밀번호 변경 필요: children 렌더링 차단
  if (user?.mustChangePassword) return null;

  return <>{children}</>;
}

// 하위 호환 export
export { AuthGuard as PasswordChangeGuard };
