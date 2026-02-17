'use client';

import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';

export function AdminContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main className={cn(
      'pt-14 transition-all duration-200',
      collapsed ? 'pl-16' : 'pl-60',
    )}>
      <div className="px-6 py-6">{children}</div>
    </main>
  );
}
