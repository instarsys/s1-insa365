'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Scale,
  ScrollText,
  Building2,
  Users,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';

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
  const { collapsed, toggleCollapsed } = useSidebar();

  // 접힌 상태 툴팁
  const [tooltipItem, setTooltipItem] = useState<string | null>(null);
  const [tooltipTop, setTooltipTop] = useState(0);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const handleTooltipEnter = useCallback((href: string) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    const el = itemRefs.current[href];
    if (el) {
      const rect = el.getBoundingClientRect();
      setTooltipTop(rect.top + rect.height / 2 - 16);
    }
    setTooltipItem(href);
  }, []);

  const handleTooltipLeave = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => setTooltipItem(null), 100);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    };
  }, []);

  const tooltipMenu = collapsed && tooltipItem ? menuItems.find(i => i.href === tooltipItem) : null;

  return (
    <>
      <aside className={cn(
        'fixed left-0 top-14 bottom-0 z-40 border-r border-gray-200 bg-white transition-all duration-200',
        collapsed ? 'w-16 overflow-visible' : 'w-60 overflow-y-auto',
      )}>
        <nav className="flex flex-col py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');

            return collapsed ? (
              <Link
                key={item.href}
                ref={(el) => { itemRefs.current[item.href] = el; }}
                href={item.href}
                onMouseEnter={() => handleTooltipEnter(item.href)}
                onMouseLeave={handleTooltipLeave}
                className={cn(
                  'relative flex items-center justify-center py-2.5 mx-1 rounded-md transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <Icon className={cn('h-5 w-5', active ? 'text-indigo-600' : 'text-gray-500')} />
                {active && <div className="absolute left-0 top-0 h-full w-[3px] -ml-1 rounded-r bg-indigo-600" />}
              </Link>
            ) : (
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

        {/* 토글 버튼 + 하단 라벨 */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
          <button
            onClick={toggleCollapsed}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5 mx-auto" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span>접기</span>
              </>
            )}
          </button>
          {!collapsed && (
            <div className="px-4 py-2 text-xs text-gray-400">
              System Admin Console
            </div>
          )}
        </div>
      </aside>

      {/* 접힌 상태 툴팁 */}
      {collapsed && tooltipMenu && (
        <div
          className="fixed z-50 ml-16 rounded-md border border-gray-200 bg-gray-800 text-white px-3 py-1.5 text-sm shadow-lg whitespace-nowrap"
          style={{ top: tooltipTop }}
          onMouseEnter={() => {
            if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
          }}
          onMouseLeave={handleTooltipLeave}
        >
          {tooltipMenu.label}
          {/* bridge 요소 */}
          <div className="absolute -left-2 top-0 bottom-0 w-2" />
        </div>
      )}
    </>
  );
}
