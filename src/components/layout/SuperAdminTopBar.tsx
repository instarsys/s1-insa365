'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function SuperAdminTopBar() {
  const { user, logout } = useAuth();
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

  const displayName = user?.name ?? '시스템관리자';
  const initial = displayName.charAt(0);

  const handleLogout = async () => {
    setShowMenu(false);
    await logout();
    window.location.href = '/super-admin/login';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-indigo-600">s1-insa365</span>
        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
          System Admin
        </span>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600 hover:bg-indigo-200 transition-colors"
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
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
