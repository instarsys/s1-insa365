'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AttendanceCalendarCell } from './AttendanceCalendarCell';
import {
  getDaysInMonth,
  getDayOfWeek,
  isSunday,
  isSaturday,
  isWeekend as checkWeekend,
  isToday as checkToday,
} from '@/lib/attendance-utils';
import type { CalendarAttendanceItem } from '@/hooks/useAttendance';

interface AttendanceCalendarGridProps {
  year: number;
  month: number;
  items: CalendarAttendanceItem[];
  dailySummary: Record<number, number>;
  showLeave?: boolean;
  colorMode?: 'status' | 'department';
  onCellClick: (userId: string, day: number, hasData: boolean, recordId?: string) => void;
  onEmployeeClick: (userId: string) => void;
  compact?: boolean;
}

export function AttendanceCalendarGrid({
  year,
  month,
  items,
  dailySummary,
  showLeave = true,
  colorMode = 'status',
  onCellClick,
  onEmployeeClick,
  compact = false,
}: AttendanceCalendarGridProps) {
  const router = useRouter();
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollIndicators();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollIndicators);
    const ro = new ResizeObserver(updateScrollIndicators);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollIndicators); ro.disconnect(); };
  }, [updateScrollIndicators]);

  const handleDateHeaderClick = useCallback(
    (day: number) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      router.push(`/attendance/records?date=${dateStr}`);
    },
    [router, year, month],
  );

  // Compute grand total of workDays
  const totalWorkDays = items.reduce((sum, item) => sum + item.workDays, 0);

  return (
    <div className="relative rounded-lg border border-gray-200 bg-white">
      {/* Scroll shadow indicators */}
      {canScrollLeft && (
        <div className={cn('pointer-events-none absolute top-0 bottom-0 z-30 w-4 bg-gradient-to-r from-black/5 to-transparent', compact ? 'left-[72px]' : 'left-[80px]')} />
      )}
      {canScrollRight && (
        <div className={cn('pointer-events-none absolute top-0 bottom-0 z-30 w-4 bg-gradient-to-l from-black/5 to-transparent', compact ? 'right-[44px]' : 'right-[52px]')} />
      )}
      <div ref={scrollRef} className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50">
              {/* Sticky employee column header */}
              <th className={cn('sticky left-0 z-20 border-r border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600', compact ? 'min-w-[72px] px-1.5 py-2' : 'min-w-[80px] px-2 py-2.5')}>
                직원
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className={cn(
                    'border-r border-b border-gray-200 text-center font-medium cursor-pointer hover:bg-indigo-50/50 transition-colors',
                    compact ? 'min-w-[34px] px-0.5 py-2' : 'min-w-[44px] px-1 py-2.5',
                    checkToday(year, month, day) && 'bg-amber-50',
                    isSunday(year, month, day) && 'text-red-500',
                    isSaturday(year, month, day) && 'text-blue-500',
                    !isSunday(year, month, day) && !isSaturday(year, month, day) && 'text-gray-600',
                  )}
                  onClick={() => handleDateHeaderClick(day)}
                >
                  <div>{day}</div>
                  <div className="text-[10px] font-normal opacity-70">
                    {getDayOfWeek(year, month, day)}
                  </div>
                </th>
              ))}
              {/* 합계 열 — sticky right */}
              <th className={cn('sticky right-0 z-20 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-600', compact ? 'min-w-[44px] px-1.5 py-2' : 'min-w-[52px] px-2 py-2.5')}>
                합계
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((employee) => (
              <tr key={employee.userId} className="hover:bg-gray-50/50">
                {/* Sticky employee name */}
                <td className={cn('sticky left-0 z-10 border-r border-b border-gray-200 bg-white', compact ? 'min-w-[72px] px-1.5 py-1' : 'min-w-[80px] px-2 py-1.5')}>
                  <button
                    className="text-left hover:text-indigo-600 transition-colors"
                    onClick={() => onEmployeeClick(employee.userId)}
                  >
                    <div className={cn('font-medium text-gray-800 truncate', compact ? 'text-xs max-w-[56px]' : 'text-xs max-w-[64px]')}>
                      {employee.userName}
                    </div>
                    <div className={cn('text-gray-400 truncate', compact ? 'text-[10px] max-w-[56px]' : 'text-[10px] max-w-[64px]')}>
                      {employee.departmentName ?? ''}
                    </div>
                  </button>
                </td>
                {days.map((day) => {
                  const att = employee.attendances[day];
                  return (
                    <AttendanceCalendarCell
                      key={day}
                      data={att}
                      isWeekend={checkWeekend(year, month, day)}
                      isToday={checkToday(year, month, day)}
                      showLeave={showLeave}
                      colorMode={colorMode}
                      departmentName={employee.departmentName}
                      compact={compact}
                      onClick={() =>
                        onCellClick(
                          employee.userId,
                          day,
                          !!att,
                          att?.id,
                        )
                      }
                    />
                  );
                })}
                {/* 합계 열 — sticky right */}
                <td className={cn('sticky right-0 z-10 border-b border-gray-200 bg-white text-center font-medium text-gray-700', compact ? 'min-w-[44px] px-1.5 py-1 text-[10px]' : 'min-w-[52px] px-2 py-1.5 text-xs')}>
                  {employee.workDays}일
                </td>
              </tr>
            ))}

            {/* 합계 행 */}
            <tr className="bg-gray-50/80">
              <td className={cn('sticky left-0 z-10 border-r border-gray-200 bg-gray-50 font-semibold text-gray-600', compact ? 'min-w-[72px] px-1.5 py-1.5 text-[10px]' : 'min-w-[80px] px-2 py-2 text-xs')}>
                합계
              </td>
              {days.map((day) => (
                <td
                  key={day}
                  className={cn(
                    'border-r border-gray-100 text-center text-gray-500',
                    compact ? 'min-w-[34px] px-0.5 py-1.5 text-[10px]' : 'min-w-[44px] px-1 py-2 text-xs',
                    checkToday(year, month, day) && 'bg-amber-50/50',
                  )}
                >
                  {dailySummary[day] ?? 0}명
                </td>
              ))}
              <td className={cn('sticky right-0 z-10 bg-gray-50 text-center font-semibold text-gray-700', compact ? 'min-w-[44px] px-1.5 py-1.5 text-[10px]' : 'min-w-[52px] px-2 py-2 text-xs')}>
                {totalWorkDays}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
