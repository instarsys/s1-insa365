'use client';

import { useState, useMemo } from 'react';
import { Receipt, X, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatKRW } from '@/lib/utils';
import { useWithholdingSummary, useWithholdingEmployees } from '@/hooks/useTax';

const currentYear = new Date().getFullYear();

function generateYearOptions() {
  return [currentYear - 1, currentYear, currentYear + 1].map((y) => ({
    value: String(y),
    label: `${y}년`,
  }));
}

export default function WithholdingPage() {
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { items: data, isLoading } = useWithholdingSummary(year);
  const { items: employees, isLoading: empLoading } = useWithholdingEmployees(year, selectedMonth);

  const yearOptions = useMemo(() => generateYearOptions(), []);

  const totals = useMemo(() => {
    const result = {
      headCount: 0,
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
      result.headCount += row.headCount;
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

  const thCls = 'px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500';
  const tdCls = 'px-3 py-3 text-right text-sm tabular-nums';

  return (
    <div>
      <PageHeader title="원천징수 현황" subtitle="원천징수 내역을 조회합니다." />

      <Card className="mb-6">
        <CardBody>
          <Select
            label="연도"
            options={yearOptions}
            value={String(year)}
            onChange={(v) => { setYear(Number(v)); setSelectedMonth(null); }}
            wrapperClassName="w-28"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{year}년 원천징수 현황</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
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
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">월</th>
                    <th className={thCls}>인원</th>
                    <th className={thCls}>총과세소득</th>
                    <th className={thCls}>국민연금</th>
                    <th className={thCls}>건강보험</th>
                    <th className={thCls}>장기요양</th>
                    <th className={thCls}>고용보험</th>
                    <th className={thCls}>소득세</th>
                    <th className={thCls}>지방소득세</th>
                    <th className={`${thCls} bg-gray-100 font-bold text-gray-700`}>합계</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row) => (
                    <tr
                      key={row.month}
                      className={`cursor-pointer transition-colors ${selectedMonth === row.month ? 'bg-indigo-50' : 'hover:bg-indigo-50/30'}`}
                      onClick={() => setSelectedMonth(selectedMonth === row.month ? null : row.month)}
                    >
                      <td className="px-3 py-3 font-medium">{row.month}월</td>
                      <td className={tdCls}>{row.headCount}명</td>
                      <td className={tdCls}>{formatKRW(row.taxableIncome)}</td>
                      <td className={tdCls}>{formatKRW(row.nationalPension)}</td>
                      <td className={tdCls}>{formatKRW(row.healthInsurance)}</td>
                      <td className={tdCls}>{formatKRW(row.longTermCare)}</td>
                      <td className={tdCls}>{formatKRW(row.employmentInsurance)}</td>
                      <td className={tdCls}>{formatKRW(row.incomeTax)}</td>
                      <td className={tdCls}>{formatKRW(row.localIncomeTax)}</td>
                      <td className={`${tdCls} bg-gray-50 font-semibold`}>{formatKRW(row.total)}</td>
                      <td className="px-2">
                        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${selectedMonth === row.month ? 'rotate-90' : ''}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <td className="px-3 py-3">합계</td>
                    <td className={tdCls}>{totals.headCount}명</td>
                    <td className={tdCls}>{formatKRW(totals.taxableIncome)}</td>
                    <td className={tdCls}>{formatKRW(totals.nationalPension)}</td>
                    <td className={tdCls}>{formatKRW(totals.healthInsurance)}</td>
                    <td className={tdCls}>{formatKRW(totals.longTermCare)}</td>
                    <td className={tdCls}>{formatKRW(totals.employmentInsurance)}</td>
                    <td className={tdCls}>{formatKRW(totals.incomeTax)}</td>
                    <td className={tdCls}>{formatKRW(totals.localIncomeTax)}</td>
                    <td className={`${tdCls} bg-gray-100 font-bold`}>{formatKRW(totals.total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 직원별 원천징수 상세 패널 */}
      {selectedMonth !== null && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{year}년 {selectedMonth}월 직원별 원천징수 상세</CardTitle>
            <button onClick={() => setSelectedMonth(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardBody className="p-0">
            {empLoading ? (
              <Spinner text="직원 데이터 로딩중..." className="py-8" />
            ) : employees.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">사번</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">이름</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">부서</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">총지급</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">과세소득</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-blue-600">국민연금</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-blue-600">건강보험</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-blue-600">장기요양</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-blue-600">고용보험</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-red-600">소득세</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-red-600">지방소득세</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 bg-gray-100">총공제</th>
                      <th className="px-3 py-2 text-right text-xs font-bold text-emerald-700 bg-emerald-50">실수령</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((emp) => (
                      <tr key={emp.userId} className="hover:bg-indigo-50/30">
                        <td className="px-3 py-2 text-xs text-gray-500">{emp.employeeNumber}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{emp.employeeName}</td>
                        <td className="px-3 py-2 text-gray-600">{emp.departmentName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatKRW(emp.totalPay)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatKRW(emp.taxableIncome)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-600">{formatKRW(emp.nationalPension)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-600">{formatKRW(emp.healthInsurance)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-600">{formatKRW(emp.longTermCare)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-600">{formatKRW(emp.employmentInsurance)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-600">{formatKRW(emp.incomeTax)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-600">{formatKRW(emp.localIncomeTax)}</td>
                        <td className="px-3 py-2 text-right tabular-nums bg-gray-50 font-semibold">{formatKRW(emp.totalDeduction)}</td>
                        <td className="px-3 py-2 text-right tabular-nums bg-emerald-50/50 font-semibold text-emerald-700">{formatKRW(emp.netPay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
