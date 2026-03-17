'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Card, CardBody, Tabs } from '@/components/ui';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { fetcher } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type DayStatus = 'normal' | 'absent' | 'late' | 'leave' | 'none';

interface DayData {
  date: number;
  hours: number;
  status: DayStatus;
}

interface AttendanceItem {
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  regularMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  totalMinutes: number;
  isHoliday: boolean;
  isOutOfRange?: boolean;
  checkInLocationName?: string | null;
  checkOutLocationName?: string | null;
  note: string | null;
}

interface MyAttendanceResponse {
  year: number;
  month: number;
  items: AttendanceItem[];
}

const statusDot: Record<DayStatus, string> = {
  normal: 'bg-emerald-500',
  absent: 'bg-red-500',
  late: 'bg-amber-500',
  leave: 'bg-blue-500',
  none: '',
};

const statusLabel: Record<DayStatus, string> = {
  normal: '정상출근',
  absent: '결근',
  late: '지각/조퇴',
  leave: '휴가',
  none: '',
};

function mapStatus(apiStatus: string): DayStatus {
  switch (apiStatus) {
    case 'ON_TIME': return 'normal';
    case 'LATE':
    case 'EARLY_LEAVE':
    case 'HALF_DAY': return 'late';
    case 'ABSENT': return 'absent';
    case 'LEAVE':
    case 'HOLIDAY': return 'leave';
    default: return 'none';
  }
}

function buildAttendanceMap(items: AttendanceItem[]): Map<string, AttendanceItem> {
  const map = new Map<string, AttendanceItem>();
  for (const item of items) {
    map.set(item.date, item);
  }
  return map;
}

function WeeklyView({ items }: { items: AttendanceItem[] }) {
  const attendanceMap = useMemo(() => buildAttendanceMap(items), [items]);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const week: DayData[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const record = attendanceMap.get(key);
    if (record) {
      return {
        date: d.getDate(),
        hours: Math.round((record.totalMinutes / 60) * 10) / 10,
        status: mapStatus(record.status),
      };
    }
    return { date: d.getDate(), hours: 0, status: 'none' as DayStatus };
  });

  const totalHours = Math.round(week.reduce((sum, d) => sum + d.hours, 0) * 10) / 10;
  const maxHours = 12;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2 px-2">
        {week.map((day, i) => {
          const barHeight = day.hours > 0 ? Math.max((day.hours / maxHours) * 100, 8) : 4;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-gray-800">{day.hours > 0 ? `${day.hours}h` : ''}</span>
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className={cn(
                    'w-6 rounded-t-md transition-all',
                    day.hours > 0 ? 'bg-indigo-500' : 'bg-gray-100',
                  )}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <span className={cn('text-[10px]', i === 0 || i === 6 ? 'text-red-400' : 'text-gray-500')}>
                {DAY_LABELS[(i + 1) % 7]}
              </span>
            </div>
          );
        })}
      </div>
      <Card className="rounded-2xl">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">이번 주 총 근무</span>
            <span className="text-sm font-bold text-indigo-600">{totalHours}시간</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function MonthlyView({ items, year, month }: { items: AttendanceItem[]; year: number; month: number }) {
  const attendanceMap = useMemo(() => buildAttendanceMap(items), [items]);
  const today = new Date();

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (DayData | null)[] = Array.from({ length: firstDay }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const record = attendanceMap.get(key);
    if (record) {
      cells.push({
        date: d,
        hours: Math.round((record.totalMinutes / 60) * 10) / 10,
        status: mapStatus(record.status),
        isOutOfRange: record.isOutOfRange,
      } as DayData);
    } else {
      cells.push({ date: d, hours: 0, status: 'none' });
    }
  }

  const totalHours = Math.round(cells.reduce((sum, d) => sum + (d?.hours ?? 0), 0) * 10) / 10;
  const workDays = cells.filter((d) => d && d.status !== 'none').length;

  return (
    <div className="space-y-4">
      <p className="text-center text-sm font-semibold text-gray-800">
        {year}년 {month}월
      </p>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map((label, i) => (
          <span key={label} className={cn('text-[10px] font-medium', i === 0 ? 'text-red-400' : 'text-gray-400')}>
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className="flex flex-col items-center py-1.5">
            {day ? (
              <>
                <span
                  className={cn(
                    'text-xs',
                    day.date === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
                      ? 'font-bold text-indigo-600'
                      : 'text-gray-700',
                  )}
                >
                  {day.date}
                </span>
                {day.status !== 'none' && (
                  <div className="mt-0.5 flex items-center gap-0.5">
                    <div className={cn('h-1.5 w-1.5 rounded-full', statusDot[day.status])} />
                    {(day as DayData & { isOutOfRange?: boolean }).isOutOfRange && (
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400" title="반경 밖" />
                    )}
                  </div>
                )}
              </>
            ) : (
              <span className="text-xs text-transparent">0</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 px-2">
        {(['normal', 'late', 'absent', 'leave'] as DayStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1">
            <div className={cn('h-2 w-2 rounded-full', statusDot[s])} />
            <span className="text-[10px] text-gray-500">{statusLabel[s]}</span>
          </div>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">이번 달 근무</span>
            <div className="text-right">
              <p className="text-sm font-bold text-indigo-600">{totalHours}시간</p>
              <p className="text-[10px] text-gray-400">{workDays}일 근무</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

const tabItems = [
  { key: 'weekly', label: '주간' },
  { key: 'monthly', label: '월간' },
];

export default function EmployeeAttendancePage() {
  const [activeTab, setActiveTab] = useState('weekly');
  const { user } = useAuth();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const { data, isLoading } = useSWR<MyAttendanceResponse>(
    user?.attendanceExempt ? null : `/api/attendance/my?year=${year}&month=${month}`,
    fetcher,
    { revalidateOnFocus: true },
  );

  const items = data?.items ?? [];

  if (user?.attendanceExempt) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-gray-800">근태</h1>
        <Card className="rounded-2xl">
          <CardBody className="p-6 text-center">
            <p className="text-sm text-gray-500">
              근태 면제 대상으로 근태 기록이 없습니다.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">근태</h1>
      <Tabs tabs={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      <div className="pt-2">
        {isLoading ? (
          <Spinner text="근태 데이터 로딩중..." className="py-12" />
        ) : activeTab === 'weekly' ? (
          <WeeklyView items={items} />
        ) : (
          <MonthlyView items={items} year={year} month={month} />
        )}
      </div>
    </div>
  );
}
