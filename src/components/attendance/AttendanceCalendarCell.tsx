'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import {
  formatTimeShort,
  getStatusBarColor,
  getStatusTextColor,
  getStatusLabel,
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
  data: CellData | null | undefined;
  isWeekend: boolean;
  isToday: boolean;
  showLeave?: boolean;
  colorMode?: 'status' | 'department';
  departmentName?: string | null;
  compact?: boolean;
  onClick: () => void;
}

const AttendanceCalendarCell = memo(function AttendanceCalendarCell({
  data,
  isWeekend,
  isToday,
  showLeave = true,
  colorMode = 'status',
  departmentName,
  compact = false,
  onClick,
}: AttendanceCalendarCellProps) {
  if (!data) {
    return (
      <td
        className={cn(
          'border-r border-b border-gray-100 text-center cursor-pointer transition-colors',
          compact ? 'h-11 min-w-[34px] px-0.5 text-[10px]' : 'h-14 min-w-[44px] px-1 text-xs',
          isToday && 'bg-amber-50/50',
          isWeekend && 'bg-gray-50/50',
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
  const isHoliday = data.status === 'HOLIDAY';
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
        ) : (isLeave || isHoliday) && !showLeave ? (
          <span className="text-gray-300">-</span>
        ) : isLeave ? (
          <span className="font-medium">휴가</span>
        ) : isHoliday ? (
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
