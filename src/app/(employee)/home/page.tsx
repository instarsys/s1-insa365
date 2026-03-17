'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { Clock, Bell, ChevronRight, Wallet, AlertTriangle, ClipboardList } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import { useAuth } from '@/hooks';
import { useNotifications } from '@/hooks';
import { useAttendanceMutations } from '@/hooks';
import { cn, formatKRW } from '@/lib/utils';
import { fetcher } from '@/lib/api';
import { GpsLocationStatus } from '@/components/employee/GpsLocationStatus';
import { GpsWarningModal } from '@/components/employee/GpsWarningModal';

type ClockStatus = 'not_started' | 'checked_in' | 'checked_out';

interface GpsValidationResult {
  isWithinRange: boolean;
  nearestLocation: { id: string; name: string; distance: number } | null;
  enforcement: string;
  allowed: boolean;
  warningMessage?: string;
}

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

function useGeoLocation() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS를 지원하지 않는 브라우저입니다');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setError(null);
      },
      (err) => {
        setError(err.code === 1 ? 'GPS 권한이 거부되었습니다' : 'GPS 위치를 가져올 수 없습니다');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return { coords, error, requestLocation };
}

export default function EmployeeHomePage() {
  const now = useCurrentTime();
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { checkIn, checkOut } = useAttendanceMutations();
  const geo = useGeoLocation();

  const [clockStatus, setClockStatus] = useState<ClockStatus>('not_started');
  const [checkInTime, setCheckInTime] = useState<string | undefined>(undefined);
  const [checkOutTime, setCheckOutTime] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'checkIn' | 'checkOut' | null>(null);

  // Restore today's attendance status on load
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: todayAttendance } = useSWR<{ items: { checkInTime?: string; checkOutTime?: string }[] }>(
    `/api/attendance/daily?date=${todayStr}&userId=me`,
    fetcher,
    { revalidateOnFocus: true },
  );

  useEffect(() => {
    if (todayAttendance?.items?.length) {
      const record = todayAttendance.items[0];
      if (record.checkOutTime) {
        setClockStatus('checked_out');
        setCheckInTime(record.checkInTime);
        setCheckOutTime(record.checkOutTime);
      } else if (record.checkInTime) {
        setClockStatus('checked_in');
        setCheckInTime(record.checkInTime);
      }
    }
  }, [todayAttendance]);

  // Request GPS on mount
  useEffect(() => {
    geo.requestLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPS 위치 상태 조회
  const gpsQueryParams = geo.coords
    ? `?latitude=${geo.coords.latitude}&longitude=${geo.coords.longitude}`
    : '';
  const { data: gpsStatus, isLoading: gpsLoading } = useSWR<GpsValidationResult>(
    geo.coords ? `/api/attendance/gps-status${gpsQueryParams}` : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 30000 },
  );

  // Fetch last month's actual salary
  const { data: payHistory } = useSWR<{ items: { netPay: number }[] }>(
    '/api/payroll/history?limit=1',
    fetcher,
    { revalidateOnFocus: false },
  );
  const lastMonthPay = payHistory?.items?.[0]?.netPay;

  const workMinutes = (() => {
    if (!checkInTime) return 0;
    const start = new Date(checkInTime).getTime();
    const end = checkOutTime ? new Date(checkOutTime).getTime() : Date.now();
    return Math.floor((end - start) / 60000);
  })();

  const workHours = Math.floor(workMinutes / 60);
  const workMins = workMinutes % 60;

  const executeClockAction = useCallback(async (action: 'checkIn' | 'checkOut') => {
    setIsLoading(true);
    try {
      const locationData = geo.coords
        ? { latitude: geo.coords.latitude, longitude: geo.coords.longitude }
        : {};

      if (action === 'checkIn') {
        await checkIn(locationData);
        setCheckInTime(new Date().toISOString());
        setClockStatus('checked_in');
      } else {
        await checkOut(locationData);
        setCheckOutTime(new Date().toISOString());
        setClockStatus('checked_out');
      }
    } catch {
      // Error handled by API client
    } finally {
      setIsLoading(false);
    }
  }, [checkIn, checkOut, geo.coords]);

  const handleClockAction = useCallback(async () => {
    const action = clockStatus === 'checked_in' ? 'checkOut' : 'checkIn';

    // WARN 모드 + 반경 밖 → 경고 모달 표시
    if (gpsStatus && gpsStatus.enforcement === 'WARN' && !gpsStatus.isWithinRange) {
      setPendingAction(action);
      setShowWarningModal(true);
      return;
    }

    await executeClockAction(action);
  }, [clockStatus, gpsStatus, executeClockAction]);

  const handleWarningConfirm = useCallback(async () => {
    setShowWarningModal(false);
    if (pendingAction) {
      await executeClockAction(pendingAction);
      setPendingAction(null);
    }
  }, [pendingAction, executeClockAction]);

  const handleWarningCancel = useCallback(() => {
    setShowWarningModal(false);
    setPendingAction(null);
  }, []);

  const buttonLabel = clockStatus === 'checked_in' ? '퇴근하기' : '출근하기';
  const buttonColor = clockStatus === 'checked_in'
    ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
    : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800';

  // BLOCK 모드에서 반경 밖이면 버튼 비활성화
  const isBlocked = gpsStatus?.enforcement === 'BLOCK' && !gpsStatus?.allowed;

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

      {/* Clock button or Exempt notice */}
      {user?.attendanceExempt ? (
        <Card className="rounded-2xl">
          <CardBody className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <ClipboardList className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800">근태 면제 대상</p>
            <p className="mt-1 text-xs text-gray-500">
              출퇴근 기록이 필요 없는 근태 면제 대상입니다.
            </p>
            <p className="text-xs text-gray-500">
              매월 고정 급여가 지급됩니다.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="flex flex-col items-center py-4">
            <p className="mb-3 text-3xl font-light tabular-nums text-gray-800">{formatTime(now)}</p>
            <button
              onClick={handleClockAction}
              disabled={isLoading || isBlocked}
              className={cn(
                'flex h-28 w-28 flex-col items-center justify-center rounded-full text-white shadow-lg transition-all',
                'disabled:opacity-60',
                isBlocked ? 'bg-gray-400 cursor-not-allowed' : buttonColor,
              )}
            >
              <Clock className="mb-1 h-6 w-6" />
              <span className="text-base font-semibold">{isBlocked ? '출근불가' : buttonLabel}</span>
            </button>
            <div className="mt-2">
              {geo.error ? (
                <div className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-500">{geo.error}</span>
                </div>
              ) : (
                <GpsLocationStatus
                  gpsStatus={gpsStatus ?? null}
                  isLoading={gpsLoading}
                  gpsError={null}
                />
              )}
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
                  <p className="mt-0.5 text-sm font-semibold text-indigo-600">
                    {workHours}시간 {workMins}분
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      )}

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
            <p className="mt-0.5 text-sm font-bold text-indigo-600">
              {lastMonthPay != null ? formatKRW(lastMonthPay) : '-'}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Recent notifications */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">최근 알림</p>
          <button className="flex items-center text-xs text-indigo-600">
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                      <Icon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-xs', n.isRead ? 'text-gray-500' : 'font-medium text-gray-800')}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* GPS Warning Modal */}
      <GpsWarningModal
        open={showWarningModal}
        locationName={gpsStatus?.nearestLocation?.name}
        distance={gpsStatus?.nearestLocation?.distance}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />
    </div>
  );
}
