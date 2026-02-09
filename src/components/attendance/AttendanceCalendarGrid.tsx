'use client';

import { useCallback } from 'react';
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
}: AttendanceCalendarGridProps) {
  const router = useRouter();
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50">
            {/* Sticky employee column header */}
            <th className="sticky left-0 z-20 min-w-[120px] border-r border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
              직원
            </th>
            {days.map((day) => (
              <th
                key={day}
                className={cn(
                  'min-w-[68px] border-r border-b border-gray-200 px-1 py-2.5 text-center font-medium cursor-pointer hover:bg-indigo-50/50 transition-colors',
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
            {/* 합계 열 */}
            <th className="min-w-[52px] border-b border-gray-200 bg-gray-50 px-2 py-2.5 text-center text-xs font-semibold text-gray-600">
              합계
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((employee) => (
            <tr key={employee.userId} className="hover:bg-gray-50/50">
              {/* Sticky employee name */}
              <td className="sticky left-0 z-10 min-w-[120px] border-r border-b border-gray-200 bg-white px-3 py-1.5">
                <button
                  className="text-left hover:text-indigo-600 transition-colors"
                  onClick={() => onEmployeeClick(employee.userId)}
                >
                  <div className="text-xs font-medium text-gray-800 truncate max-w-[100px]">
                    {employee.userName}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate max-w-[100px]">
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
              {/* 합계 열 */}
              <td className="min-w-[52px] border-b border-gray-200 px-2 py-1.5 text-center text-xs font-medium text-gray-700">
                {employee.workDays}일
              </td>
            </tr>
          ))}

          {/* 합계 행 */}
          <tr className="bg-gray-50/80">
            <td className="sticky left-0 z-10 min-w-[120px] border-r border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
              합계
            </td>
            {days.map((day) => (
              <td
                key={day}
                className={cn(
                  'min-w-[68px] border-r border-gray-100 px-1 py-2 text-center text-xs text-gray-500',
                  checkToday(year, month, day) && 'bg-amber-50/50',
                )}
              >
                {dailySummary[day] ?? 0}명
              </td>
            ))}
            <td className="min-w-[52px] px-2 py-2 text-center text-xs font-semibold text-gray-700">
              {totalWorkDays}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
