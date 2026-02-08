'use client';

import { useState, useEffect, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatKRW } from '@/lib/utils';
import { apiGet } from '@/lib/api';

interface DepartmentCost {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  totalPay: number;
  totalDeduction: number;
  totalNetPay: number;
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

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

export default function DepartmentCostReportPage() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<DepartmentCost[]>([]);
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(() => generateYearOptions(), []);

  useEffect(() => {
    setLoading(true);
    apiGet<{ departments: DepartmentCost[] }>('/api/reports/department-cost', { year, month })
      .then((res) => setData(res.departments))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  const stats = useMemo(() => {
    const totalCost = data.reduce((s, d) => s + d.totalPay, 0);
    const totalEmployees = data.reduce((s, d) => s + d.employeeCount, 0);
    const totalNet = data.reduce((s, d) => s + d.totalNetPay, 0);
    return { totalCost, totalEmployees, totalNet };
  }, [data]);

  return (
    <div>
      <PageHeader title="부서별 인건비" subtitle="부서별 인건비 현황을 조회합니다." />

      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <Select
              label="연도"
              options={yearOptions}
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              className="w-32"
            />
            <Select
              label="월"
              options={MONTH_OPTIONS}
              value={String(month)}
              onChange={(v) => setMonth(Number(v))}
              className="w-28"
            />
          </div>
        </CardBody>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="총 인건비" value={formatKRW(stats.totalCost)} />
        <StatCard title="총 직원수" value={`${stats.totalEmployees}명`} />
        <StatCard title="총 실수령" value={formatKRW(stats.totalNet)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>부서별 인건비 현황</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <Spinner text="로딩중..." className="py-12" />
          ) : data.length === 0 ? (
            <EmptyState
              title="인건비 데이터가 없습니다"
              icon={<Building2 className="h-10 w-10" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">부서</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">인원</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">총 지급액</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">총 공제액</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">총 실수령</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row) => (
                    <tr key={row.departmentId} className="hover:bg-purple-50/30">
                      <td className="px-4 py-3 font-medium">{row.departmentName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.employeeCount}명</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatKRW(row.totalPay)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600">-{formatKRW(row.totalDeduction)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                        {formatKRW(row.totalNetPay)}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-3">합계</td>
                    <td className="px-4 py-3 text-right tabular-nums">{stats.totalEmployees}명</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKRW(stats.totalCost)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600">
                      -{formatKRW(data.reduce((s, d) => s + d.totalDeduction, 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                      {formatKRW(stats.totalNet)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
