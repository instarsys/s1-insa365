'use client';

import { PageHeader } from '@/components/layout';
import {
  Table, Badge, Spinner, EmptyState,
} from '@/components/ui';
import { useOvertimeStatus } from '@/hooks';
import { AlertTriangle, Clock } from 'lucide-react';

function getOvertimeBadge(weeklyHours: number, isWarning: boolean, isOverLimit: boolean) {
  if (isOverLimit) return <Badge variant="error">초과</Badge>;
  if (isWarning) return <Badge variant="warning">주의</Badge>;
  return <Badge variant="success">정상</Badge>;
}

export default function OvertimeMonitorPage() {
  const { items, isLoading } = useOvertimeStatus();

  // Sort by weekly hours descending
  const sortedItems = [...items].sort((a, b) => b.weeklyHours - a.weeklyHours);

  // Top 10 for bar chart
  const top10 = sortedItems.slice(0, 10);
  const maxHours = Math.max(...top10.map((i) => i.weeklyHours), 52);

  const overLimitCount = items.filter((i) => i.isOverLimit).length;
  const warningCount = items.filter((i) => i.isWarning && !i.isOverLimit).length;

  const columns = [
    { key: 'userName', label: '이름', sortable: true },
    {
      key: 'departmentName',
      label: '부서',
      render: (row: Record<string, unknown>) => (row.departmentName as string) || '-',
    },
    {
      key: 'weeklyHours',
      label: '주간 근무시간',
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const hours = row.weeklyHours as number;
        return (
          <span className={
            (row.isOverLimit as boolean) ? 'font-semibold text-red-600' :
            (row.isWarning as boolean) ? 'font-semibold text-amber-600' :
            'text-gray-700'
          }>
            {hours.toFixed(1)}h
          </span>
        );
      },
    },
    {
      key: 'status',
      label: '상태',
      render: (row: Record<string, unknown>) =>
        getOvertimeBadge(
          row.weeklyHours as number,
          row.isWarning as boolean,
          row.isOverLimit as boolean,
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="52시간 모니터링" subtitle="주 52시간 초과 위험 직원을 모니터링합니다." />

      {/* Summary badges */}
      {!isLoading && items.length > 0 && (
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">초과 {overLimitCount}명</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">주의 {warningCount}명</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2">
            <span className="text-sm font-medium text-emerald-700">정상 {items.length - overLimitCount - warningCount}명</span>
          </div>
        </div>
      )}

      {/* Bar visualization for top employees */}
      {!isLoading && top10.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">주간 근무시간 상위</h3>
          <div className="space-y-2">
            {top10.map((item) => {
              const widthPercent = (item.weeklyHours / maxHours) * 100;
              const barColor = item.isOverLimit
                ? 'bg-red-500'
                : item.isWarning
                  ? 'bg-amber-400'
                  : 'bg-emerald-400';
              return (
                <div key={item.userId} className="flex items-center gap-3">
                  <span className="w-20 truncate text-xs text-gray-600">{item.userName}</span>
                  <div className="flex-1">
                    <div className="h-5 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-5 rounded-full ${barColor} transition-all duration-300`}
                        style={{ width: `${Math.min(widthPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-14 text-right text-xs font-medium text-gray-600">
                    {item.weeklyHours.toFixed(1)}h
                  </span>
                </div>
              );
            })}
            {/* Reference lines */}
            <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
              <span>0h</span>
              <span className="text-amber-500">48h (주의)</span>
              <span className="text-red-500">52h (법정한도)</span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <Spinner text="52시간 현황을 불러오는 중..." className="py-20" />
      ) : sortedItems.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-12 w-12" />}
          title="금주 근무 기록이 없습니다"
          description="직원들의 출퇴근 기록이 쌓이면 52시간 현황이 표시됩니다."
        />
      ) : (
        <div className="rounded-lg border border-gray-200">
          <Table
            columns={columns}
            data={sortedItems as unknown as Record<string, unknown>[]}
          />
        </div>
      )}
    </div>
  );
}
