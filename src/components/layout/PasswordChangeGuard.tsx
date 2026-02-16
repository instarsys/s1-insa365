'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';

export function PasswordChangeGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [user, isLoading, router]);

  if (user?.mustChangePassword) return null;

  return <>{children}</>;
}
