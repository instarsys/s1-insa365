'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Scale,
  ScrollText,
  Building2,
  Users,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { label: '대시보드', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { label: '법정 파라미터', href: '/super-admin/legal-params', icon: Scale },
  { label: '감사 로그', href: '/super-admin/audit-log', icon: ScrollText },
  { label: '테넌트 관리', href: '/super-admin/tenants', icon: Building2 },
  { label: '사용자 관리', href: '/super-admin/users', icon: Users },
  { label: '플랜 관리', href: '/super-admin/plans', icon: CreditCard },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 bottom-0 z-40 w-60 overflow-y-auto border-r border-gray-200 bg-white">
      <nav className="flex flex-col py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-600 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-indigo-600'
                  : 'text-gray-700 hover:bg-gray-50',
              )}
            >
              <Icon className={cn('h-5 w-5', active ? 'text-indigo-600' : 'text-gray-500')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 px-4 py-3 text-xs text-gray-400">
        System Admin Console
      </div>
    </aside>
  );
}
