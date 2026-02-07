'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, CalendarDays, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { label: '홈', href: '/home', icon: Home },
  { label: '근태', href: '/e/attendance', icon: Clock },
  { label: '휴가', href: '/leave', icon: CalendarDays },
  { label: '급여', href: '/salary', icon: Wallet },
  { label: 'MY', href: '/my', icon: User },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center gap-0.5',
              active ? 'text-purple-600' : 'text-gray-400',
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
