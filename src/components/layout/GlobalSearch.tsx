'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, LayoutGrid, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'employee' | 'menu';
  label: string;
  description?: string;
  href: string;
}

const MENU_ITEMS: SearchResult[] = [
  { type: 'menu', label: '대시보드', href: '/dashboard' },
  { type: 'menu', label: '직원 목록', href: '/employees/list' },
  { type: 'menu', label: '부서/직급 관리', href: '/employees/departments' },
  { type: 'menu', label: '일별 근태', href: '/attendance/daily' },
  { type: 'menu', label: '월별 현황', href: '/attendance/monthly' },
  { type: 'menu', label: '휴가 관리', href: '/attendance/leave' },
  { type: 'menu', label: '52시간 모니터링', href: '/attendance/overtime' },
  { type: 'menu', label: '급여 실행', href: '/payroll/run' },
  { type: 'menu', label: '급여 이력', href: '/payroll/history' },
  { type: 'menu', label: '급여대장', href: '/payroll/ledger' },
  { type: 'menu', label: '급여명세서', href: '/payroll/payslips' },
  { type: 'menu', label: '리포트', href: '/reports/payroll' },
  { type: 'menu', label: '설정', href: '/settings/company' },
  { type: 'menu', label: '법정 파라미터', href: '/system/legal-params' },
  { type: 'menu', label: '감사 로그', href: '/system/audit-log' },
];

interface Employee {
  id: string;
  name: string;
  employeeNumber: string;
  departmentName?: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Fetch employees for search (debounced-like: load once on open)
  useEffect(() => {
    if (!open) return;
    fetch('/api/employees?limit=200')
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((data) => setEmployees(data.items ?? []))
      .catch(() => setEmployees([]));
  }, [open]);

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const matched: SearchResult[] = [];

    // Match employees
    for (const emp of employees) {
      if (
        emp.name.toLowerCase().includes(q) ||
        emp.employeeNumber.toLowerCase().includes(q)
      ) {
        matched.push({
          type: 'employee',
          label: emp.name,
          description: `${emp.employeeNumber}${emp.departmentName ? ` · ${emp.departmentName}` : ''}`,
          href: `/employees/${emp.id}`,
        });
      }
      if (matched.filter((m) => m.type === 'employee').length >= 5) break;
    }

    // Match menus
    for (const menu of MENU_ITEMS) {
      if (menu.label.toLowerCase().includes(q)) {
        matched.push(menu);
      }
    }

    return matched;
  }, [query, employees]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const navigate = useCallback((result: SearchResult) => {
    setOpen(false);
    router.push(result.href);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex]);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-gray-300 hover:bg-white"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">검색...</span>
        <kbd className="hidden rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:inline">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/20" />

      {/* Search Dialog */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[20vh]">
        <div
          ref={containerRef}
          className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl"
        >
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="직원, 메뉴 검색..."
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          {query.trim() && (
            <div className="max-h-72 overflow-y-auto py-2">
              {results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500">
                  검색 결과가 없습니다.
                </p>
              ) : (
                <>
                  {/* Employee section */}
                  {results.some((r) => r.type === 'employee') && (
                    <div className="px-3 pb-1 pt-2">
                      <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">직원</p>
                    </div>
                  )}
                  {results
                    .map((result, i) => {
                      // Insert menu section header
                      const isFirstMenu = result.type === 'menu' && (i === 0 || results[i - 1].type !== 'menu');
                      return (
                        <div key={`${result.type}-${result.href}`}>
                          {isFirstMenu && (
                            <div className="px-3 pb-1 pt-3">
                              <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">메뉴</p>
                            </div>
                          )}
                          <button
                            onClick={() => navigate(result)}
                            onMouseEnter={() => setSelectedIndex(i)}
                            className={cn(
                              'flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm transition-colors',
                              i === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50',
                            )}
                          >
                            {result.type === 'employee' ? (
                              <Users className="h-4 w-4 shrink-0 text-gray-400" />
                            ) : (
                              <LayoutGrid className="h-4 w-4 shrink-0 text-gray-400" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{result.label}</p>
                              {result.description && (
                                <p className="truncate text-xs text-gray-500">{result.description}</p>
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          )}

          {/* Hint when empty */}
          {!query.trim() && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              직원 이름, 사번 또는 메뉴를 검색하세요
            </div>
          )}
        </div>
      </div>
    </>
  );
}
