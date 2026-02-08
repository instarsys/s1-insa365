'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Clock,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
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
      { label: '일별 근태', href: '/attendance/daily' },
      { label: '월별 현황', href: '/attendance/monthly' },
      { label: '휴가 관리', href: '/attendance/leave' },
      { label: '52시간 모니터링', href: '/attendance/overtime' },
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
      { label: '플랜/결제', href: '/settings/billing' },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
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

  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const current = visibleMenuItems.find(
      (item) => pathname.startsWith(item.href) && item.children,
    );
    return current ? [current.href] : [];
  });

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

  if (isLoading) {
    return (
      <aside className="fixed left-0 top-14 bottom-0 z-40 w-60 overflow-y-auto border-r border-gray-200 bg-white">
        <nav className="flex flex-col gap-1 py-4 px-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100" />
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-14 bottom-0 z-40 w-60 overflow-y-auto border-r border-gray-200 bg-white">
      <nav className="flex flex-col py-4">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.href);
          const active = isActive(item.href) || isParentActive(item.href);
          const showSection = sectionStarts.has(item.href);

          return (
            <div key={item.href}>
              {showSection && (
                <div className="mt-4 mb-1 px-4 text-xs font-medium text-gray-400">
                  {item.section}
                </div>
              )}
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.href)}
                  className={cn(
                    'relative flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-purple-50 text-purple-600 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-purple-600'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <Icon className={cn('h-5 w-5', active ? 'text-purple-600' : 'text-gray-500')} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? (
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
                      ? 'bg-purple-50 text-purple-600 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-purple-600'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <Icon className={cn('h-5 w-5', active ? 'text-purple-600' : 'text-gray-500')} />
                  <span>{item.label}</span>
                </Link>
              )}

              {/* Submenu */}
              {hasChildren && isExpanded && (
                <div className="ml-4">
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'flex items-center py-2 pl-8 pr-4 text-sm transition-colors',
                        isActive(child.href)
                          ? 'text-purple-600 font-medium'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Version */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 px-4 py-3 text-xs text-gray-400">
        v0.1.0
      </div>
    </aside>
  );
}
