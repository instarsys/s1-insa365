'use client';

import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export function MobileTopBar() {
  const { unreadCount } = useNotifications();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4">
      <span className="text-base font-bold text-indigo-600">s1-insa365</span>
      <button className="relative rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
}
