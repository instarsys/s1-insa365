'use client';

import { useState, useEffect, useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatKRW } from '@/lib/utils';
import { apiGet } from '@/lib/api';

interface MonthlyWithholding {
  month: number;
  taxableIncome: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localIncomeTax: number;
  total: number;
}

const currentYear = new Date().getFullYear();

function generateYearOptions() {
  return [currentYear - 1, currentYear, currentYear + 1].map((y) => ({
    value: String(y),
    label: `${y}년`,
  }));
}

export default function WithholdingPage() {
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<MonthlyWithholding[]>([]);
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(() => generateYearOptions(), []);

  useEffect(() => {
    apiGet<{ items: MonthlyWithholding[] }>(`/api/tax/withholding?year=${year}`)
      .then((res) => setData(res.items))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [year]);

  const totals = useMemo(() => {
    const result = {
      taxableIncome: 0,
      nationalPension: 0,
      healthInsurance: 0,
      longTermCare: 0,
      employmentInsurance: 0,
      incomeTax: 0,
      localIncomeTax: 0,
      total: 0,
    };
    for (const row of data) {
      result.taxableIncome += row.taxableIncome;
      result.nationalPension += row.nationalPension;
      result.healthInsurance += row.healthInsurance;
      result.longTermCare += row.longTermCare;
      result.employmentInsurance += row.employmentInsurance;
      result.incomeTax += row.incomeTax;
      result.localIncomeTax += row.localIncomeTax;
      result.total += row.total;
    }
    return result;
  }, [data]);

  return (
    <div>
      <PageHeader title="원천징수 현황" subtitle="원천징수 내역을 조회합니다." />

      <Card className="mb-6">
        <CardBody>
          <Select
            label="연도"
            options={yearOptions}
            value={String(year)}
            onChange={(v) => { setYear(Number(v)); setLoading(true); }}
            className="w-32"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{year}년 원천징수 현황</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <Spinner text="로딩중..." className="py-12" />
          ) : data.length === 0 ? (
            <EmptyState
              title="원천징수 데이터가 없습니다"
              description="급여를 확정하면 원천징수 데이터가 생성됩니다."
              icon={<Receipt className="h-10 w-10" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">월</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">총과세소득</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">국민연금</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">건강보험</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">장기요양</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">고용보험</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">소득세</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">지방소득세</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100">합계</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row) => (
                    <tr key={row.month} className="hover:bg-purple-50/30">
                      <td className="px-4 py-3 font-medium">{row.month}월</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatKRW(row.taxableIncome)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatKRW(row.nationalPension)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatKRW(row.healthInsurance)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatKRW(row.longTermCare)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatKRW(row.employmentInsurance)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatKRW(row.incomeTax)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatKRW(row.localIncomeTax)}</td>
                      <td className="px-4 py-3 text-right bg-gray-50 font-semibold tabular-nums">{formatKRW(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <td className="px-4 py-3">합계</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKRW(totals.taxableIncome)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKRW(totals.nationalPension)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKRW(totals.healthInsurance)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKRW(totals.longTermCare)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKRW(totals.employmentInsurance)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKRW(totals.incomeTax)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKRW(totals.localIncomeTax)}</td>
                    <td className="px-4 py-3 text-right bg-gray-100 font-bold tabular-nums">{formatKRW(totals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
