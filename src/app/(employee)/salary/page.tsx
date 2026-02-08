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

interface PayItem {
  label: string;
  value: number | undefined;
  bold?: boolean;
  color?: string;
}

function PayBreakdown({ item }: { item: { basePay?: number; fixedAllowances?: number; overtimePay?: number; nightPay?: number; holidayPay?: number; variableAllowances?: number; totalNonTaxable?: number; totalPay: number; nationalPension?: number; healthInsurance?: number; longTermCare?: number; employmentInsurance?: number; incomeTax?: number; localIncomeTax?: number; totalDeduction: number; totalNetPay: number } }) {
  const payItems: PayItem[] = [
    { label: '기본급', value: item.basePay },
    { label: '고정수당', value: item.fixedAllowances },
    { label: '연장근로수당', value: item.overtimePay },
    { label: '야간수당', value: item.nightPay },
    { label: '휴일수당', value: item.holidayPay },
    { label: '변동수당', value: item.variableAllowances },
    { label: '비과세', value: item.totalNonTaxable },
  ].filter((p) => p.value && p.value > 0);

  const deductionItems: PayItem[] = [
    { label: '국민연금', value: item.nationalPension },
    { label: '건강보험', value: item.healthInsurance },
    { label: '장기요양보험', value: item.longTermCare },
    { label: '고용보험', value: item.employmentInsurance },
    { label: '소득세', value: item.incomeTax },
    { label: '지방소득세', value: item.localIncomeTax },
  ].filter((p) => p.value && p.value > 0);

  return (
    <div className="space-y-3">
      {/* Pay items */}
      {payItems.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">지급 항목</p>
          <div className="space-y-1">
            {payItems.map((p) => (
              <div key={p.label} className="flex justify-between text-xs">
                <span className="text-gray-500">{p.label}</span>
                <span className="text-gray-800">{formatKRW(p.value ?? 0)}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between border-t border-gray-100 pt-1.5 text-xs">
            <span className="font-medium text-gray-600">총 지급</span>
            <span className="font-semibold text-gray-800">{formatKRW(item.totalPay)}</span>
          </div>
        </div>
      )}

      {/* Deduction items */}
      {deductionItems.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">공제 항목</p>
          <div className="space-y-1">
            {deductionItems.map((p) => (
              <div key={p.label} className="flex justify-between text-xs">
                <span className="text-gray-500">{p.label}</span>
                <span className="text-red-600">-{formatKRW(p.value ?? 0)}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between border-t border-gray-100 pt-1.5 text-xs">
            <span className="font-medium text-gray-600">총 공제</span>
            <span className="font-semibold text-red-600">-{formatKRW(item.totalDeduction)}</span>
          </div>
        </div>
      )}

      {/* Net pay */}
      <div className="flex justify-between border-t border-purple-200 pt-2">
        <span className="text-sm font-medium text-gray-700">실수령</span>
        <span className="text-base font-bold text-purple-600">{formatKRW(item.totalNetPay)}</span>
      </div>
    </div>
  );
}

export default function EmployeeSalaryPage() {
  const { history } = usePayrollHistory();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [latestExpanded, setLatestExpanded] = useState(false);

  const latest = history.length > 0 ? history[0] : null;
  const hasDetailFields = latest && latest.basePay !== undefined;

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

            {latestExpanded && hasDetailFields ? (
              <PayBreakdown item={latest} />
            ) : (
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
            )}

            {hasDetailFields && (
              <button
                onClick={() => setLatestExpanded(!latestExpanded)}
                className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-purple-500 hover:text-purple-700"
              >
                {latestExpanded ? '접기' : '항목별 상세보기'}
                {latestExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
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
              const itemHasDetail = item.basePay !== undefined;
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
                        {itemHasDetail ? (
                          <PayBreakdown item={item} />
                        ) : (
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
                          </div>
                        )}
                        {item.confirmedAt && (
                          <div className="mt-2 flex justify-between text-xs">
                            <span className="text-gray-500">확정일</span>
                            <span className="text-gray-800">
                              {new Date(item.confirmedAt).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        )}
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
