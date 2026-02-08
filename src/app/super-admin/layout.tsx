'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SuperAdminTopBar } from '@/components/layout/SuperAdminTopBar';
import { SuperAdminSidebar } from '@/components/layout/SuperAdminSidebar';
import { Providers } from '@/components/layout/Providers';
import { useAuth } from '@/hooks/useAuth';

export default function SuperAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const isLoginPage = pathname === '/super-admin/login';

  useEffect(() => {
    if (isLoginPage || isLoading) return;
    if (!isAuthenticated || user?.role !== 'SYSTEM_ADMIN') {
      router.replace('/super-admin/login');
    }
  }, [isLoginPage, isLoading, isAuthenticated, user?.role, router]);

  // Login page: simple centered layout (no sidebar/topbar)
  if (isLoginPage) {
    return (
      <Providers>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="w-full max-w-md px-4">{children}</div>
        </div>
      </Providers>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Providers>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-sm text-gray-500">로딩 중...</div>
        </div>
      </Providers>
    );
  }

  // Not authorized
  if (!isAuthenticated || user?.role !== 'SYSTEM_ADMIN') {
    return null;
  }

  return (
    <Providers>
      <div className="min-h-screen bg-gray-50">
        <SuperAdminTopBar />
        <SuperAdminSidebar />
        <main className="pl-60 pt-14">
          <div className="mx-auto max-w-[1280px] p-8">{children}</div>
        </main>
      </div>
    </Providers>
  );
}
