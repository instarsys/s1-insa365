'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/contexts/SidebarContext';
import type { Role } from '@/lib/types';

interface SubMenuItem {
  label: string;
  href: string;
}

interface MenuItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  allowedRoles: Role[];
  children?: SubMenuItem[];
}

// PRD 4.9 역할별 메뉴 가시성
const menuItems: MenuItemConfig[] = [
  {
    label: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
    section: '',
    allowedRoles: ['COMPANY_ADMIN', 'MANAGER'],
  },
  {
    label: '직원 관리',
    href: '/employees',
    icon: Users,
    section: '인사',
    allowedRoles: ['COMPANY_ADMIN', 'MANAGER'],
    children: [
      { label: '직원 목록', href: '/employees/list' },
      { label: '합류 초대', href: '/employees/invitations' },
      { label: '부서/직급 관리', href: '/employees/departments' },
      { label: '일괄 업로드', href: '/employees/import' },
    ],
  },
  {
    label: '근태 관리',
    href: '/attendance',
    icon: Clock,
    section: '근태',
    allowedRoles: ['COMPANY_ADMIN', 'MANAGER'],
    children: [
      { label: '달력형', href: '/attendance/calendar' },
      { label: '목록형', href: '/attendance/records' },
      { label: '52시간 모니터링', href: '/attendance/overtime' },
    ],
  },
  {
    label: '휴가 관리',
    href: '/attendance/leave',
    icon: CalendarDays,
    section: '근태',
    allowedRoles: ['COMPANY_ADMIN', 'MANAGER'],
    children: [
      { label: '휴가 관리', href: '/attendance/leave' },
      { label: '휴가 발생', href: '/attendance/leave/accruals' },
    ],
  },
  {
    label: '급여 관리',
    href: '/payroll',
    icon: Wallet,
    section: '급여',
    allowedRoles: ['COMPANY_ADMIN', 'MANAGER'],
    children: [
      { label: '급여 실행', href: '/payroll/run' },
      { label: '급여 이력', href: '/payroll/history' },
      { label: '급여대장', href: '/payroll/ledger' },
      { label: '급여명세서', href: '/payroll/payslips' },
    ],
  },
  {
    label: '세무/신고',
    href: '/tax',
    icon: FileText,
    section: '세무/리포트',
    allowedRoles: ['COMPANY_ADMIN'],
    children: [
      { label: '원천징수 현황', href: '/tax/withholding' },
      { label: '신고 데이터', href: '/tax/reports' },
    ],
  },
  {
    label: '리포트',
    href: '/reports',
    icon: BarChart3,
    section: '세무/리포트',
    allowedRoles: ['COMPANY_ADMIN', 'MANAGER'],
    children: [
      { label: '급여 리포트', href: '/reports/payroll' },
      { label: '근태 리포트', href: '/reports/attendance' },
      { label: '부서별 인건비', href: '/reports/department-cost' },
      { label: '4대보험 현황', href: '/reports/insurance-status' },
    ],
  },
  {
    label: '설정',
    href: '/settings',
    icon: Settings,
    section: '관리',
    allowedRoles: ['COMPANY_ADMIN'],
    children: [
      { label: '회사 정보', href: '/settings/company' },
      { label: '근무 정책', href: '/settings/work-policy' },
      { label: '급여 규칙', href: '/settings/salary-rules' },
      { label: '휴가 유형', href: '/settings/leave-types' },
      { label: '휴가 그룹', href: '/settings/leave-groups' },
      { label: '발생 규칙', href: '/settings/leave-accrual-rules' },
      { label: '플랜/결제', href: '/settings/billing' },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { collapsed, toggleCollapsed } = useSidebar();
  const userRole = user?.role;

  const ROLE_HIERARCHY: Record<Role, number> = {
    SYSTEM_ADMIN: 4, COMPANY_ADMIN: 3, MANAGER: 2, EMPLOYEE: 1,
  };
  const visibleMenuItems = userRole
    ? menuItems.filter((item) => {
        const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
        const minRequired = Math.min(...item.allowedRoles.map((r) => ROLE_HIERARCHY[r] ?? 99));
        return userLevel >= minRequired;
      })
    : [];

  // 클릭으로 고정된 펼침 상태
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const current = visibleMenuItems.find(
      (item) => pathname.startsWith(item.href) && item.children,
    );
    return current ? [current.href] : [];
  });

  // 호버 자동 펼침
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 접힌 상태 플로팅 패널
  const [floatingItem, setFloatingItem] = useState<string | null>(null);
  const [floatingTop, setFloatingTop] = useState(0);
  const floatingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleMouseEnter = useCallback((href: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredItem(href), 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = null;
    setHoveredItem(null);
  }, []);

  const handleFloatingEnter = useCallback((href: string) => {
    if (floatingTimeoutRef.current) clearTimeout(floatingTimeoutRef.current);
    const el = itemRefs.current[href];
    if (el) {
      const rect = el.getBoundingClientRect();
      setFloatingTop(rect.top);
    }
    setFloatingItem(href);
  }, []);

  const handleFloatingLeave = useCallback(() => {
    floatingTimeoutRef.current = setTimeout(() => setFloatingItem(null), 100);
  }, []);

  const handleFloatingPanelEnter = useCallback(() => {
    if (floatingTimeoutRef.current) clearTimeout(floatingTimeoutRef.current);
  }, []);

  const handleFloatingPanelLeave = useCallback(() => {
    floatingTimeoutRef.current = setTimeout(() => setFloatingItem(null), 100);
  }, []);

  // cleanup timeouts
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (floatingTimeoutRef.current) clearTimeout(floatingTimeoutRef.current);
    };
  }, []);

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  };

  const isActive = (href: string) => pathname === href;
  const isParentActive = (href: string) => pathname.startsWith(href) && pathname !== href;

  // Precompute which items start a new section (based on visible items only)
  const sectionStarts = new Set<string>();
  let prevSection = '';
  for (const item of visibleMenuItems) {
    if (item.section && item.section !== prevSection) {
      sectionStarts.add(item.href);
      prevSection = item.section;
    }
  }

  if (isLoading || !user) {
    return (
      <aside className={cn(
        'fixed left-0 top-14 bottom-0 z-40 overflow-y-auto border-r border-gray-200 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}>
        <nav className="flex flex-col gap-1 py-4 px-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100" />
          ))}
        </nav>
      </aside>
    );
  }

  // 접힌 상태에서의 플로팅 패널
  const floatingMenu = collapsed && floatingItem ? visibleMenuItems.find(i => i.href === floatingItem) : null;

  return (
    <>
      <aside className={cn(
        'fixed left-0 top-14 bottom-0 z-40 border-r border-gray-200 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
        collapsed ? 'overflow-visible' : 'overflow-y-auto',
      )}>
        <nav className="flex flex-col py-4">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.includes(item.href);
            const isHovered = hoveredItem === item.href;
            const active = isActive(item.href) || isParentActive(item.href);
            const showSection = sectionStarts.has(item.href);

            return (
              <div
                key={item.href}
                ref={(el) => { itemRefs.current[item.href] = el; }}
                onMouseEnter={() => {
                  if (collapsed) {
                    handleFloatingEnter(item.href);
                  } else if (hasChildren) {
                    handleMouseEnter(item.href);
                  }
                }}
                onMouseLeave={() => {
                  if (collapsed) {
                    handleFloatingLeave();
                  } else {
                    handleMouseLeave();
                  }
                }}
              >
                {/* 섹션 라벨 */}
                {showSection && !collapsed && (
                  <div className="mt-4 mb-1 px-4 text-xs font-medium text-gray-400">
                    {item.section}
                  </div>
                )}
                {showSection && collapsed && (
                  <div className="mt-3 mb-1 border-t border-gray-100 mx-2" />
                )}

                {/* 메뉴 아이템 */}
                {collapsed ? (
                  // 접힌 상태: 아이콘만
                  hasChildren ? (
                    <div
                      className={cn(
                        'relative flex items-center justify-center py-2.5 mx-1 rounded-md transition-colors cursor-pointer',
                        active
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      <Icon className={cn('h-5 w-5', active ? 'text-indigo-600' : 'text-gray-500')} />
                      {active && <div className="absolute left-0 top-0 h-full w-[3px] -ml-1 rounded-r bg-indigo-600" />}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
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
                  )
                ) : (
                  // 펼친 상태: 아이콘 + 라벨
                  <>
                    {hasChildren ? (
                      <button
                        onClick={() => toggleExpand(item.href)}
                        className={cn(
                          'relative flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                          active
                            ? 'bg-indigo-50 text-indigo-600 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-indigo-600'
                            : 'text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        <Icon className={cn('h-5 w-5', active ? 'text-indigo-600' : 'text-gray-500')} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isExpanded || isHovered ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    ) : (
                      <Link
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
                    )}
                  </>
                )}

                {/* 하위메뉴 (CSS Grid 높이 애니메이션) */}
                {hasChildren && !collapsed && (
                  <div className={cn(
                    'ml-4 grid transition-[grid-template-rows] duration-200 ease-in-out',
                    (isExpanded || isHovered) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}>
                    <div className="overflow-hidden">
                      {item.children!.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center py-2 pl-8 pr-4 text-sm transition-colors',
                            isActive(child.href)
                              ? 'text-indigo-600 font-medium'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 토글 버튼 + 버전 */}
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
              v0.1.0
            </div>
          )}
        </div>
      </aside>

      {/* 접힌 상태 플로팅 패널 */}
      {collapsed && floatingMenu && (
        <div
          className="fixed z-50 ml-16 min-w-[180px] rounded-md border border-gray-200 bg-white shadow-lg py-1"
          style={{ top: floatingTop }}
          onMouseEnter={handleFloatingPanelEnter}
          onMouseLeave={handleFloatingPanelLeave}
        >
          {/* 부모 메뉴 라벨 */}
          {floatingMenu.children && floatingMenu.children.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-100">
                {floatingMenu.label}
              </div>
              {floatingMenu.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'block px-3 py-2 text-sm transition-colors',
                    isActive(child.href)
                      ? 'text-indigo-600 font-medium bg-indigo-50'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                  onClick={() => setFloatingItem(null)}
                >
                  {child.label}
                </Link>
              ))}
            </>
          ) : (
            <Link
              href={floatingMenu.href}
              className={cn(
                'block px-3 py-2 text-sm transition-colors',
                isActive(floatingMenu.href)
                  ? 'text-indigo-600 font-medium bg-indigo-50'
                  : 'text-gray-700 hover:bg-gray-50',
              )}
              onClick={() => setFloatingItem(null)}
            >
              {floatingMenu.label}
            </Link>
          )}
          {/* bridge 요소: 아이콘과 패널 사이 간격 연결 */}
          <div className="absolute -left-2 top-0 bottom-0 w-2" />
        </div>
      )}
    </>
  );
}
