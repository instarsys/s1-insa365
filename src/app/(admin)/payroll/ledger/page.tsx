'use client';

import { useState, useMemo } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePayrollLedger } from '@/hooks';
import { formatKRW } from '@/lib/utils';

const currentDate = new Date();

function generateYearOptions() {
  const year = currentDate.getFullYear();
  return [year - 1, year, year + 1].map((y) => ({ value: String(y), label: `${y}년` }));
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));

interface LedgerItem {
  label: string;
  amount: number;
  description?: string;
}

interface LedgerEmployee {
  employeeNumber: string;
  employeeName: string;
  departmentName: string;
  payItems: LedgerItem[];
  deductionItems: LedgerItem[];
  totalPay: number;
  totalDeduction: number;
  netPay: number;
  [key: string]: unknown;
}

interface LedgerData {
  employees: LedgerEmployee[];
}

export default function PayrollLedgerPage() {
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

  const { ledger, isLoading } = usePayrollLedger(year, month);
  const data = ledger as LedgerData | undefined;
  const employees = useMemo(() => data?.employees ?? [], [data]);

  const yearOptions = useMemo(() => generateYearOptions(), []);

  // Gather all unique column labels
  const allAllowances = useMemo(() => {
    const seen = new Set<string>();
    const result: { label: string }[] = [];
    for (const emp of employees) {
      for (const item of emp.payItems ?? []) {
        if (!seen.has(item.label)) { seen.add(item.label); result.push({ label: item.label }); }
      }
    }
    return result;
  }, [employees]);

  const allDeductions = useMemo(() => {
    const seen = new Set<string>();
    const result: { label: string }[] = [];
    for (const emp of employees) {
      for (const item of emp.deductionItems ?? []) {
        if (!seen.has(item.label)) { seen.add(item.label); result.push({ label: item.label }); }
      }
    }
    return result;
  }, [employees]);

  function getPayAmount(emp: LedgerEmployee, label: string): number {
    return (emp.payItems ?? []).find((i) => i.label === label)?.amount ?? 0;
  }

  function getDeductionAmount(emp: LedgerEmployee, label: string): number {
    return (emp.deductionItems ?? []).find((i) => i.label === label)?.amount ?? 0;
  }

  // Totals
  const totals = useMemo(() => {
    const result = {
      totalPay: 0,
      totalDeduction: 0,
      netPay: 0,
      byLabel: new Map<string, number>(),
    };
    for (const emp of employees) {
      result.totalPay += emp.totalPay;
      result.totalDeduction += emp.totalDeduction;
      result.netPay += emp.netPay;
      for (const item of emp.payItems ?? []) {
        result.byLabel.set(item.label, (result.byLabel.get(item.label) ?? 0) + item.amount);
      }
      for (const item of emp.deductionItems ?? []) {
        result.byLabel.set(item.label, (result.byLabel.get(item.label) ?? 0) + item.amount);
      }
    }
    return result;
  }, [employees]);

  return (
    <div>
      <PageHeader title="급여대장" subtitle="확정된 급여대장을 조회합니다.">
        <Button variant="secondary" disabled>
          <Download className="h-4 w-4" />
          Excel 다운로드
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-end gap-4">
            <Select
              label="연도"
              options={yearOptions}
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              wrapperClassName="w-28"
            />
            <Select
              label="월"
              options={MONTH_OPTIONS}
              value={String(month)}
              onChange={(v) => setMonth(Number(v))}
              wrapperClassName="w-24"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{year}년 {month}월 급여대장</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner text="급여대장 로딩중..." className="py-12" />
          ) : employees.length === 0 ? (
            <EmptyState
              title="급여대장이 없습니다"
              description="급여를 확정하면 급여대장이 생성됩니다."
              icon={<FileSpreadsheet className="h-10 w-10" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-10 whitespace-nowrap bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      사번
                    </th>
                    <th className="sticky left-[5rem] z-10 whitespace-nowrap bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      이름
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      부서
                    </th>
                    {allAllowances.map((col) => (
                      <th key={col.label} className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-blue-600">
                        {col.label}
                      </th>
                    ))}
                    <th className="whitespace-nowrap bg-blue-50 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-blue-700">
                      총지급
                    </th>
                    {allDeductions.map((col) => (
                      <th key={col.label} className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-red-600">
                        {col.label}
                      </th>
                    ))}
                    <th className="whitespace-nowrap bg-red-50 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-red-700">
                      총공제
                    </th>
                    <th className="whitespace-nowrap bg-emerald-50 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-emerald-700">
                      실수령
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map((emp, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/30">
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3 text-xs text-gray-500">
                        {emp.employeeNumber}
                      </td>
                      <td className="sticky left-[5rem] z-10 whitespace-nowrap bg-white px-4 py-3 text-sm font-medium text-gray-800">
                        {emp.employeeName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {emp.departmentName}
                      </td>
                      {allAllowances.map((col) => (
                        <td key={col.label} className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums">
                          {formatKRW(getPayAmount(emp, col.label))}
                        </td>
                      ))}
                      <td className="whitespace-nowrap bg-blue-50/50 px-4 py-3 text-right text-sm font-semibold tabular-nums text-blue-700">
                        {formatKRW(emp.totalPay)}
                      </td>
                      {allDeductions.map((col) => (
                        <td key={col.label} className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-red-600">
                          {formatKRW(getDeductionAmount(emp, col.label))}
                        </td>
                      ))}
                      <td className="whitespace-nowrap bg-red-50/50 px-4 py-3 text-right text-sm font-semibold tabular-nums text-red-700">
                        {formatKRW(emp.totalDeduction)}
                      </td>
                      <td className="whitespace-nowrap bg-emerald-50/50 px-4 py-3 text-right text-sm font-bold tabular-nums text-emerald-700">
                        {formatKRW(emp.netPay)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer totals */}
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-sm" colSpan={3}>
                      합계 ({employees.length}명)
                    </td>
                    {allAllowances.map((col) => (
                      <td key={col.label} className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums">
                        {formatKRW(totals.byLabel.get(col.label) ?? 0)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap bg-blue-50 px-4 py-3 text-right text-sm tabular-nums text-blue-700">
                      {formatKRW(totals.totalPay)}
                    </td>
                    {allDeductions.map((col) => (
                      <td key={col.label} className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-red-600">
                        {formatKRW(totals.byLabel.get(col.label) ?? 0)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap bg-red-50 px-4 py-3 text-right text-sm tabular-nums text-red-700">
                      {formatKRW(totals.totalDeduction)}
                    </td>
                    <td className="whitespace-nowrap bg-emerald-50 px-4 py-3 text-right text-sm font-bold tabular-nums text-emerald-700">
                      {formatKRW(totals.netPay)}
                    </td>
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
