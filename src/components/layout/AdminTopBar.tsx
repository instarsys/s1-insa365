'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { GlobalSearch } from './GlobalSearch';

export function AdminTopBar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name ?? '사용자';
  const initial = displayName.charAt(0);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-purple-600">s1-insa365</span>
      </div>

      {/* Center: Global Search */}
      <GlobalSearch />

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Company Name */}
        <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
          <span>{user?.companyName ?? '회사'}</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        {/* Profile Avatar + Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-600 hover:bg-purple-200 transition-colors"
          >
            {initial}
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={() => { setShowMenu(false); window.location.href = '/settings/profile'; }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                내 프로필
              </button>
              <button
                onClick={() => { setShowMenu(false); logout(); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
