'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatKRW } from '@/lib/utils';
import { apiGet } from '@/lib/api';

interface MonthlyPayroll {
  year: number;
  month: number;
  totalEmployees: number;
  totalPay: number;
  totalNetPay: number;
}

const currentYear = new Date().getFullYear();

function generateYearOptions() {
  return [currentYear - 1, currentYear, currentYear + 1].map((y) => ({
    value: String(y),
    label: `${y}년`,
  }));
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));

export default function PayrollReportPage() {
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState(12);
  const [data, setData] = useState<MonthlyPayroll[]>([]);
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(() => generateYearOptions(), []);

  useEffect(() => {
    apiGet<{ items: MonthlyPayroll[] }>('/api/reports/payroll', {
      startYear,
      startMonth,
      endYear,
      endMonth,
    })
      .then((res) => setData(res.items))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [startYear, startMonth, endYear, endMonth]);

  const stats = useMemo(() => {
    if (data.length === 0) return { avgPay: 0, totalEmployees: 0, totalCost: 0 };
    const totalCost = data.reduce((sum, d) => sum + d.totalPay, 0);
    const totalEmployees = data.reduce((sum, d) => sum + d.totalEmployees, 0);
    return {
      avgPay: data.length > 0 ? Math.round(totalCost / data.length) : 0,
      totalEmployees: data.length > 0 ? Math.round(totalEmployees / data.length) : 0,
      totalCost,
    };
  }, [data]);

  return (
    <div>
      <PageHeader title="급여 리포트" subtitle="급여 관련 리포트를 조회합니다." />

      {/* Period selector */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <Select
              label="시작 연도"
              options={yearOptions}
              value={String(startYear)}
              onChange={(v) => { setStartYear(Number(v)); setLoading(true); }}
              wrapperClassName="w-28"
            />
            <Select
              label="시작 월"
              options={MONTH_OPTIONS}
              value={String(startMonth)}
              onChange={(v) => { setStartMonth(Number(v)); setLoading(true); }}
              wrapperClassName="w-24"
            />
            <span className="pb-2 text-gray-400">~</span>
            <Select
              label="종료 연도"
              options={yearOptions}
              value={String(endYear)}
              onChange={(v) => { setEndYear(Number(v)); setLoading(true); }}
              wrapperClassName="w-28"
            />
            <Select
              label="종료 월"
              options={MONTH_OPTIONS}
              value={String(endMonth)}
              onChange={(v) => { setEndMonth(Number(v)); setLoading(true); }}
              wrapperClassName="w-24"
            />
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="월 평균 인건비" value={formatKRW(stats.avgPay)} />
        <StatCard title="평균 직원수" value={stats.totalEmployees} />
        <StatCard title="총 인건비" value={formatKRW(stats.totalCost)} />
      </div>

      {/* Monthly trend */}
      <Card>
        <CardHeader>
          <CardTitle>월별 급여 추이</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <Spinner text="로딩중..." className="py-12" />
          ) : data.length === 0 ? (
            <EmptyState
              title="급여 데이터가 없습니다"
              icon={<TrendingUp className="h-10 w-10" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">기간</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">직원수</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">총 지급액</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">총 실수령</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">전월 대비</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row, idx) => {
                    const prev = idx > 0 ? data[idx - 1] : null;
                    const change = prev && prev.totalPay > 0
                      ? Math.round(((row.totalPay - prev.totalPay) / prev.totalPay) * 100 * 10) / 10
                      : null;

                    return (
                      <tr key={`${row.year}-${row.month}`} className="hover:bg-indigo-50/30">
                        <td className="px-4 py-3 font-medium">{row.year}년 {row.month}월</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.totalEmployees}명</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatKRW(row.totalPay)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                          {formatKRW(row.totalNetPay)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {change != null ? (
                            <span className={change >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {change >= 0 ? '+' : ''}{change}%
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
