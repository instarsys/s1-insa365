'use client';

import { useState, useMemo } from 'react';
import { Card, CardBody, Tabs } from '@/components/ui';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type DayStatus = 'normal' | 'absent' | 'late' | 'leave' | 'none';

interface DayData {
  date: number;
  hours: number;
  status: DayStatus;
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

function getWeekDays(): DayData[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isPast = d <= today;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const hours = isPast && !isWeekend ? 8 : isPast && isWeekend ? 0 : 0;
    const status: DayStatus = isPast && !isWeekend ? 'normal' : 'none';
    return { date: d.getDate(), hours, status };
  });
}

function getMonthDays(year: number, month: number): (DayData | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (DayData | null)[] = Array.from({ length: firstDay }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isPast = date <= today;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const hours = isPast && !isWeekend ? 8 : 0;
    const status: DayStatus = isPast && !isWeekend ? 'normal' : 'none';
    cells.push({ date: d, hours, status });
  }
  return cells;
}

function WeeklyView() {
  const week = getWeekDays();
  const totalHours = week.reduce((sum, d) => sum + d.hours, 0);
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
                    day.hours > 0 ? 'bg-purple-500' : 'bg-gray-100',
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
            <span className="text-sm font-bold text-purple-600">{totalHours}시간</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function MonthlyView() {
  const today = new Date();
  const [year] = useState(today.getFullYear());
  const [month] = useState(today.getMonth());

  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const totalHours = days.reduce((sum, d) => sum + (d?.hours ?? 0), 0);
  const workDays = days.filter((d) => d && d.status !== 'none').length;

  return (
    <div className="space-y-4">
      <p className="text-center text-sm font-semibold text-gray-800">
        {year}년 {month + 1}월
      </p>

      {/* Calendar header */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map((label, i) => (
          <span key={label} className={cn('text-[10px] font-medium', i === 0 ? 'text-red-400' : 'text-gray-400')}>
            {label}
          </span>
        ))}
      </div>

      {/* Calendar body */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center py-1.5">
            {day ? (
              <>
                <span
                  className={cn(
                    'text-xs',
                    day.date === today.getDate() && month === today.getMonth()
                      ? 'font-bold text-purple-600'
                      : 'text-gray-700',
                  )}
                >
                  {day.date}
                </span>
                {day.status !== 'none' && (
                  <div className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', statusDot[day.status])} />
                )}
              </>
            ) : (
              <span className="text-xs text-transparent">0</span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-2">
        {(['normal', 'late', 'absent', 'leave'] as DayStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1">
            <div className={cn('h-2 w-2 rounded-full', statusDot[s])} />
            <span className="text-[10px] text-gray-500">{statusLabel[s]}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <Card className="rounded-2xl">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">이번 달 근무</span>
            <div className="text-right">
              <p className="text-sm font-bold text-purple-600">{totalHours}시간</p>
              <p className="text-[10px] text-gray-400">{workDays}일 근무</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

const tabs = [
  { key: 'weekly', label: '주간' },
  { key: 'monthly', label: '월간' },
];

export default function EmployeeAttendancePage() {
  const [activeTab, setActiveTab] = useState('weekly');

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">근태</h1>
      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      <div className="pt-2">
        {activeTab === 'weekly' ? <WeeklyView /> : <MonthlyView />}
      </div>
    </div>
  );
}
