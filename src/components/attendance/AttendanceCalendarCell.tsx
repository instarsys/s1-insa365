'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import {
  formatTimeShort,
  getStatusBarColor,
  getStatusTextColor,
  getDepartmentColor,
} from '@/lib/attendance-utils';

interface CellData {
  id: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  isConfirmed: boolean;
  totalMinutes: number;
  note: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
}

interface AttendanceCalendarCellProps {
  year: number;
  month: number;
  day: number;
  data: CellData | null | undefined;
  isWeekend: boolean;
  isToday: boolean;
  isEmployeeWorkDay?: boolean;
  isHoliday?: boolean;
  showLeave?: boolean;
  colorMode?: 'status' | 'department';
  departmentName?: string | null;
  compact?: boolean;
  onClick: () => void;
}

const AttendanceCalendarCell = memo(function AttendanceCalendarCell({
  year,
  month,
  day,
  data,
  isWeekend,
  isToday,
  isEmployeeWorkDay = true,
  isHoliday = false,
  showLeave = true,
  colorMode = 'status',
  departmentName,
  compact = false,
  onClick,
}: AttendanceCalendarCellProps) {
  if (!data) {
    // 빈 셀 스타일 분기 (WorkPolicy.workDays + CompanyHoliday 복합 판정)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(year, month - 1, day);
    const isPast = cellDate <= today;

    // 1. 미래 날짜 → 회색 "-"
    // 2. 회사 휴일 → 연보라 배경 + "휴일"
    // 3. WorkPolicy 비근무일 (토/일 등) → 회색 "-"
    // 4. 근무일인데 빈 셀 (과거/오늘) → 빨간 배경 + "누락"
    const isMissing = isPast && isEmployeeWorkDay && !isHoliday;

    if (isHoliday && isPast) {
      return (
        <td
          className={cn(
            'border-r border-b border-gray-100 text-center cursor-pointer transition-colors',
            compact ? 'h-11 min-w-[34px] px-0.5 text-[10px]' : 'h-14 min-w-[44px] px-1 text-xs',
            'bg-purple-50/60',
            isToday && 'ring-1 ring-inset ring-amber-300',
            'hover:bg-purple-100/50',
          )}
          onClick={onClick}
        >
          <span className="font-medium text-purple-400">휴일</span>
        </td>
      );
    }

    if (isMissing) {
      return (
        <td
          className={cn(
            'border-r border-b border-gray-100 text-center cursor-pointer transition-colors',
            compact ? 'h-11 min-w-[34px] px-0.5 text-[10px]' : 'h-14 min-w-[44px] px-1 text-xs',
            'bg-red-50/60',
            isToday && 'ring-1 ring-inset ring-amber-300',
            'hover:bg-red-100/50',
          )}
          onClick={onClick}
        >
          <span className="font-medium text-red-400">누락</span>
        </td>
      );
    }

    // 미래 또는 비근무일 → 기존 회색 "-"
    return (
      <td
        className={cn(
          'border-r border-b border-gray-100 text-center cursor-pointer transition-colors',
          compact ? 'h-11 min-w-[34px] px-0.5 text-[10px]' : 'h-14 min-w-[44px] px-1 text-xs',
          isToday && 'bg-amber-50/50',
          isWeekend && 'bg-gray-50/50',
          isHoliday && 'bg-purple-50/30',
          'hover:bg-indigo-50/40',
        )}
        onClick={onClick}
      >
        <span className="text-gray-300">-</span>
      </td>
    );
  }

  const barColor = getStatusBarColor(data.status);
  const textColor = getStatusTextColor(data.status);
  const isAbsent = data.status === 'ABSENT';
  const isLeave = data.status === 'LEAVE';
  const isHolidayStatus = data.status === 'HOLIDAY';
  const noCheckOut = data.checkInTime && !data.checkOutTime;

  return (
    <td
      className={cn(
        'relative border-r border-b border-gray-100 cursor-pointer transition-colors',
        compact ? 'h-11 min-w-[34px]' : 'h-14 min-w-[44px]',
        isToday && 'bg-amber-50/50',
        isWeekend && !data && 'bg-gray-50/50',
        'hover:bg-indigo-50/40',
      )}
      onClick={onClick}
    >
      {/* Left status bar */}
      {colorMode === 'department' && departmentName ? (
        <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r" style={{ backgroundColor: getDepartmentColor(departmentName) }} />
      ) : (
        <div className={cn('absolute left-0 top-1 bottom-1 w-[3px] rounded-r', barColor)} />
      )}

      <div className={cn('flex flex-col items-center justify-center h-full leading-tight', compact ? 'px-0.5 text-[10px]' : 'px-1 text-xs', textColor)}>
        {isAbsent ? (
          <span className="font-medium">결근</span>
        ) : (isLeave || isHolidayStatus) && !showLeave ? (
          <span className="text-gray-300">-</span>
        ) : isLeave ? (
          <span className="font-medium">휴가</span>
        ) : isHolidayStatus ? (
          <span className="font-medium">공휴일</span>
        ) : (
          <>
            <span>{formatTimeShort(data.checkInTime)}</span>
            <span>{noCheckOut ? <span className="text-red-500 text-lg leading-none">●</span> : formatTimeShort(data.checkOutTime)}</span>
          </>
        )}
      </div>
    </td>
  );
});

export { AttendanceCalendarCell };
export type { CellData };
