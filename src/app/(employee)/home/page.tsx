'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Clock, Bell, ChevronRight, Wallet } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import { useAuth } from '@/hooks';
import { useNotifications } from '@/hooks';
import { useAttendanceMutations } from '@/hooks';
import { cn, formatKRW } from '@/lib/utils';

type ClockStatus = 'not_started' | 'checked_in' | 'checked_out';

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatTimeShort(isoString?: string) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'PAYROLL': return Wallet;
    case 'ATTENDANCE': return Clock;
    default: return Bell;
  }
}

export default function EmployeeHomePage() {
  const now = useCurrentTime();
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { checkIn, checkOut } = useAttendanceMutations();

  const [clockStatus, setClockStatus] = useState<ClockStatus>('not_started');
  const [checkInTime, setCheckInTime] = useState<string | undefined>(undefined);
  const [checkOutTime, setCheckOutTime] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const workMinutes = (() => {
    if (!checkInTime) return 0;
    const start = new Date(checkInTime).getTime();
    const end = checkOutTime ? new Date(checkOutTime).getTime() : Date.now();
    return Math.floor((end - start) / 60000);
  })();

  const workHours = Math.floor(workMinutes / 60);
  const workMins = workMinutes % 60;

  const handleClockAction = useCallback(async () => {
    setIsLoading(true);
    try {
      if (clockStatus === 'not_started' || clockStatus === 'checked_out') {
        await checkIn({});
        setCheckInTime(new Date().toISOString());
        setClockStatus('checked_in');
      } else {
        await checkOut({});
        setCheckOutTime(new Date().toISOString());
        setClockStatus('checked_out');
      }
    } catch {
      // Error handled by API client
    } finally {
      setIsLoading(false);
    }
  }, [clockStatus, checkIn, checkOut]);

  const buttonLabel = clockStatus === 'checked_in' ? '퇴근하기' : '출근하기';
  const buttonColor = clockStatus === 'checked_in'
    ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
    : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800';

  const recentNotifications = notifications.slice(0, 5);

  const nextPayday = (() => {
    const today = new Date();
    const thisMonth25 = new Date(today.getFullYear(), today.getMonth(), 25);
    if (today <= thisMonth25) return thisMonth25;
    return new Date(today.getFullYear(), today.getMonth() + 1, 25);
  })();

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <p className="text-sm text-gray-500">
        안녕하세요, <span className="font-medium text-gray-800">{user?.name ?? '직원'}</span>님
      </p>

      {/* Clock button */}
      <div className="flex flex-col items-center py-4">
        <p className="mb-3 text-3xl font-light tabular-nums text-gray-800">{formatTime(now)}</p>
        <button
          onClick={handleClockAction}
          disabled={isLoading}
          className={cn(
            'flex h-28 w-28 flex-col items-center justify-center rounded-full text-white shadow-lg transition-all',
            'disabled:opacity-60',
            buttonColor,
          )}
        >
          <Clock className="mb-1 h-6 w-6" />
          <span className="text-base font-semibold">{buttonLabel}</span>
        </button>
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <MapPin className="h-3 w-3" />
          <span>GPS 위치 확인됨</span>
        </div>
      </div>

      {/* Today's status */}
      <Card className="rounded-2xl">
        <CardBody className="p-4">
          <p className="mb-3 text-xs font-medium text-gray-500">오늘의 근무</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[10px] text-gray-400">출근</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-800">{formatTimeShort(checkInTime)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">퇴근</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-800">{formatTimeShort(checkOutTime)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">근무시간</p>
              <p className="mt-0.5 text-sm font-semibold text-purple-600">
                {workHours}시간 {workMins}분
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Next payday */}
      <Card className="rounded-2xl">
        <CardBody className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-gray-400">다음 급여일</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-800">
              {nextPayday.getMonth() + 1}월 {nextPayday.getDate()}일
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">지난달 실수령</p>
            <p className="mt-0.5 text-sm font-bold text-purple-600">{formatKRW(3456789)}</p>
          </div>
        </CardBody>
      </Card>

      {/* Recent notifications */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">최근 알림</p>
          <button className="flex items-center text-xs text-purple-600">
            전체보기 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        {recentNotifications.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">새로운 알림이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {recentNotifications.map((n) => {
              const Icon = getNotificationIcon(n.type);
              return (
                <Card key={n.id} className="rounded-2xl">
                  <CardBody className="flex items-start gap-3 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-50">
                      <Icon className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-xs', n.isRead ? 'text-gray-500' : 'font-medium text-gray-800')}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple-600" />}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
