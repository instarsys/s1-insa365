'use client';

import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';

export function SuperAdminContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main className={cn(
      'pt-14 transition-all duration-200',
      collapsed ? 'pl-16' : 'pl-60',
    )}>
      <div className="mx-auto max-w-[1280px] p-8">{children}</div>
    </main>
  );
}
