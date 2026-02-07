'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardBody, Badge } from '@/components/ui';
import { usePayrollHistory } from '@/hooks';
import { formatKRW } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'gray' }> = {
  CONFIRMED: { label: '확정', variant: 'success' },
  PAID: { label: '지급완료', variant: 'success' },
  DRAFT: { label: '임시', variant: 'warning' },
  FAILED: { label: '오류', variant: 'info' },
};

export default function EmployeeSalaryPage() {
  const { history } = usePayrollHistory();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const latest = history.length > 0 ? history[0] : null;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">급여</h1>

      {/* Latest payslip */}
      {latest ? (
        <Card className="rounded-2xl border-purple-200 bg-purple-50/30">
          <CardBody className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">
                {latest.year}년 {latest.month}월
              </p>
              <Badge variant={STATUS_MAP[latest.status]?.variant ?? 'gray'}>
                {STATUS_MAP[latest.status]?.label ?? latest.status}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">총 지급</span>
                <span className="font-medium text-gray-800">{formatKRW(latest.totalPay)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">총 공제</span>
                <span className="font-medium text-red-600">-{formatKRW(latest.totalDeduction)}</span>
              </div>
              <div className="border-t border-purple-200 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">실수령</span>
                  <span className="text-xl font-bold text-purple-600">{formatKRW(latest.totalNetPay)}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardBody className="p-4">
            <p className="py-4 text-center text-xs text-gray-400">급여 이력이 없습니다</p>
          </CardBody>
        </Card>
      )}

      {/* Monthly history */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-800">급여 이력</p>
        {history.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">급여 이력이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {history.map((item, idx) => {
              const isExpanded = expandedIndex === idx;
              const statusInfo = STATUS_MAP[item.status] ?? { label: item.status, variant: 'gray' as const };
              return (
                <Card key={`${item.year}-${item.month}`} className="rounded-2xl">
                  <CardBody className="p-0">
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      className="flex w-full items-center justify-between p-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">
                          {item.year}.{String(item.month).padStart(2, '0')}
                        </span>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{formatKRW(item.totalNetPay)}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">총 지급</span>
                            <span className="text-gray-800">{formatKRW(item.totalPay)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">총 공제</span>
                            <span className="text-red-600">-{formatKRW(item.totalDeduction)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">실수령</span>
                            <span className="font-semibold text-purple-600">{formatKRW(item.totalNetPay)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">대상인원</span>
                            <span className="text-gray-800">{item.totalEmployees}명</span>
                          </div>
                          {item.confirmedAt && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">확정일</span>
                              <span className="text-gray-800">
                                {new Date(item.confirmedAt).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
