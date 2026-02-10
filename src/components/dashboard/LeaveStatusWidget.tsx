'use client';

import { Card, CardHeader, CardTitle, CardBody, Spinner, EmptyState } from '@/components/ui';
import { useLeaveStatus } from '@/hooks/useDashboard';
import { CalendarDays } from 'lucide-react';

export function LeaveStatusWidget() {
  const { items, isLoading } = useLeaveStatus();

  // 상위 10명만 표시 (사용률이 높은 순)
  const sorted = [...items]
    .map((item) => ({
      ...item,
      total: Number(item.totalDays),
      used: Number(item.usedDays),
      remaining: Number(item.remainingDays),
      usageRate: Number(item.totalDays) > 0 ? (Number(item.usedDays) / Number(item.totalDays)) * 100 : 0,
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.usageRate - a.usageRate)
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-violet-500" />
          <CardTitle>휴가 현황</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <Spinner text="로딩중..." className="py-6" />
        ) : sorted.length === 0 ? (
          <EmptyState title="휴가 데이터 없음" description="올해 휴가 잔여일 데이터가 없습니다." />
        ) : (
          <div className="space-y-3">
            {sorted.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="w-16 shrink-0 truncate text-sm font-medium text-gray-800">
                  {item.user.name}
                </span>
                <span className="w-14 shrink-0 text-xs text-gray-400 truncate">
                  {item.user.department?.name ?? '-'}
                </span>
                <div className="flex-1">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.usageRate >= 90
                          ? 'bg-red-400'
                          : item.usageRate >= 70
                            ? 'bg-amber-400'
                            : 'bg-indigo-400'
                      }`}
                      style={{ width: `${Math.min(item.usageRate, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="w-20 shrink-0 text-right text-xs text-gray-500">
                  {item.used}/{item.total}일
                </span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
