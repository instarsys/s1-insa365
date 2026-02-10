'use client';

import { Card, CardHeader, CardTitle, CardBody, Badge, Spinner, EmptyState } from '@/components/ui';
import { useAttendanceMissing } from '@/hooks/useDashboard';
import { AlertCircle } from 'lucide-react';

export function AttendanceMissingWidget() {
  const { items, isLoading } = useAttendanceMissing();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <CardTitle>출퇴근 누락</CardTitle>
          {items.length > 0 && <Badge variant="error">{items.length}</Badge>}
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <Spinner text="로딩중..." className="py-6" />
        ) : items.length === 0 ? (
          <EmptyState title="누락 기록 없음" description="최근 7일간 미퇴근 기록이 없습니다." />
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">직원</th>
                  <th className="px-4 py-2 text-left">부서</th>
                  <th className="px-4 py-2 text-left">날짜</th>
                  <th className="px-4 py-2 text-left">출근시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/50">
                    <td className="px-4 py-2 font-medium text-gray-800">{item.user.name}</td>
                    <td className="px-4 py-2 text-gray-500">{item.user.department?.name ?? '-'}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(item.checkInTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
