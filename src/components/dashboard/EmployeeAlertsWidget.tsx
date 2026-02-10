'use client';

import { Card, CardHeader, CardTitle, CardBody, Spinner } from '@/components/ui';
import { useEmployeeAlerts } from '@/hooks/useDashboard';
import { UserX, MapPinOff, CalendarOff } from 'lucide-react';

const ALERT_ITEMS = [
  { key: 'resigningSoon' as const, label: '퇴사 예정 (1달)', icon: UserX, color: 'text-red-500 bg-red-50' },
  { key: 'noLocation' as const, label: '근무지 미배정', icon: MapPinOff, color: 'text-amber-500 bg-amber-50' },
  { key: 'onLeave' as const, label: '휴직 중', icon: CalendarOff, color: 'text-blue-500 bg-blue-50' },
];

export function EmployeeAlertsWidget() {
  const { alerts, isLoading } = useEmployeeAlerts();

  return (
    <Card>
      <CardHeader>
        <CardTitle>관리 필요 직원</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <Spinner text="로딩중..." className="py-6" />
        ) : (
          <div className="space-y-3">
            {ALERT_ITEMS.map(({ key, label, icon: Icon, color }) => {
              const count = alerts?.[key] ?? 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-sm text-gray-700">{label}</span>
                  <span className={`text-lg font-bold ${count > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
