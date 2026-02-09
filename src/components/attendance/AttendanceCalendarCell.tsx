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
}

interface AttendanceCalendarCellProps {
  data: CellData | null | undefined;
  isWeekend: boolean;
  isToday: boolean;
  showLeave?: boolean;
  colorMode?: 'status' | 'department';
  departmentName?: string | null;
  onClick: () => void;
}

const AttendanceCalendarCell = memo(function AttendanceCalendarCell({
  data,
  isWeekend,
  isToday,
  showLeave = true,
  colorMode = 'status',
  departmentName,
  onClick,
}: AttendanceCalendarCellProps) {
  if (!data) {
    return (
      <td
        className={cn(
          'h-14 min-w-[68px] border-r border-b border-gray-100 px-1 text-center text-xs cursor-pointer transition-colors',
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
        'relative h-14 min-w-[68px] border-r border-b border-gray-100 cursor-pointer transition-colors',
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

      <div className={cn('flex flex-col items-center justify-center h-full px-1.5 text-xs leading-tight', textColor)}>
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
