'use client';

import { Card, CardHeader, CardTitle, CardBody, Spinner } from '@/components/ui';
import { useDashboardWidgets } from '@/hooks/useDashboard';
import { BarChart3 } from 'lucide-react';
import { formatKRW } from '@/lib/utils';

export function ReportStatusWidget() {
  const { widgets, isLoading } = useDashboardWidgets();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-500" />
          <CardTitle>리포트 현황</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <Spinner text="로딩중..." className="py-6" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">금월 총 인건비</span>
              <span className="text-sm font-bold text-gray-900">
                {widgets ? formatKRW(widgets.monthlyPayroll) : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">재직 직원</span>
              <span className="text-sm font-bold text-gray-900">
                {widgets?.totalEmployees ?? 0}명
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">52시간 경고</span>
              <span className={`text-sm font-bold ${(widgets?.overtimeWarnings ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {widgets?.overtimeWarnings ?? 0}명
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">휴가 대기</span>
              <span className="text-sm font-bold text-gray-900">
                {widgets?.pendingLeaves ?? 0}건
              </span>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
