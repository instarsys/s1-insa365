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

function splitHalf<T>(arr: T[]): [T[], T[]] {
  const mid = Math.ceil(arr.length / 2);
  return [arr.slice(0, mid), arr.slice(mid)];
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

  // Split into top/bottom rows
  const [topAllowances, bottomAllowances] = useMemo(() => splitHalf(allAllowances), [allAllowances]);
  const [topDeductions, bottomDeductions] = useMemo(() => splitHalf(allDeductions), [allDeductions]);

  // Max columns per half-row (for padding cells when top/bottom counts differ)
  const payColCount = Math.max(topAllowances.length, bottomAllowances.length);
  const dedColCount = Math.max(topDeductions.length, bottomDeductions.length);

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

  // Reusable styles
  const thBase = 'whitespace-nowrap px-3 py-2 text-xs font-medium tracking-wider';
  const tdBase = 'whitespace-nowrap px-3 py-1.5 text-sm tabular-nums';
  const stickyCol1 = 'sticky left-0 z-10';
  const stickyCol2 = 'sticky left-[4.5rem] z-10';
  const sectionBorder = 'border-l-2 border-gray-300';

  function padCells(count: number, max: number, prefix: string, className?: string) {
    if (count >= max) return null;
    return Array.from({ length: max - count }, (_, i) => (
      <td key={`${prefix}-${i}`} className={className ?? tdBase}></td>
    ));
  }

  function padThCells(count: number, max: number, prefix: string) {
    if (count >= max) return null;
    return Array.from({ length: max - count }, (_, i) => (
      <th key={`${prefix}-${i}`} className={thBase}></th>
    ));
  }

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
                {/* ─── Header ─── */}
                <thead>
                  {/* Row 1: Group headers */}
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th colSpan={2} className={`${thBase} text-center text-gray-700 font-semibold`}>
                      인적사항
                    </th>
                    <th colSpan={payColCount + 1} className={`${thBase} text-center text-blue-700 font-semibold ${sectionBorder}`}>
                      지급 내역
                    </th>
                    <th colSpan={dedColCount + 1} className={`${thBase} text-center text-red-700 font-semibold ${sectionBorder}`}>
                      공제 내역
                    </th>
                    <th rowSpan={3} className={`${thBase} text-center bg-emerald-50 text-emerald-700 font-bold align-middle ${sectionBorder} min-w-[5.5rem]`}>
                      차인<br />지급액
                    </th>
                  </tr>
                  {/* Row 2: Top sub-columns */}
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className={`${thBase} text-left text-gray-500 ${stickyCol1} bg-gray-50 min-w-[4.5rem]`}>
                      사번
                    </th>
                    <th className={`${thBase} text-left text-gray-500 ${stickyCol2} bg-gray-50`}>
                      이름
                    </th>
                    {topAllowances.map((col, i) => (
                      <th key={col.label} className={`${thBase} text-right text-blue-600 ${i === 0 ? sectionBorder : ''}`}>
                        {col.label}
                      </th>
                    ))}
                    {topAllowances.length === 0 && <th className={`${thBase} ${sectionBorder}`}></th>}
                    {padThCells(topAllowances.length, payColCount, 'hpad-pay-t')}
                    <th rowSpan={2} className={`${thBase} text-right bg-blue-50 text-blue-700 font-bold align-middle min-w-[5.5rem]`}>
                      총지급
                    </th>
                    {topDeductions.map((col, i) => (
                      <th key={col.label} className={`${thBase} text-right text-red-600 ${i === 0 ? sectionBorder : ''}`}>
                        {col.label}
                      </th>
                    ))}
                    {topDeductions.length === 0 && <th className={`${thBase} ${sectionBorder}`}></th>}
                    {padThCells(topDeductions.length, dedColCount, 'hpad-ded-t')}
                    <th rowSpan={2} className={`${thBase} text-right bg-red-50 text-red-700 font-bold align-middle min-w-[5rem]`}>
                      총공제
                    </th>
                  </tr>
                  {/* Row 3: Bottom sub-columns */}
                  <tr className="bg-gray-50 border-b-2 border-gray-400">
                    <th className={`${thBase} text-left text-gray-400 ${stickyCol1} bg-gray-50`}></th>
                    <th className={`${thBase} text-left text-gray-400 ${stickyCol2} bg-gray-50`}>
                      부서
                    </th>
                    {bottomAllowances.map((col, i) => (
                      <th key={col.label} className={`${thBase} text-right text-blue-500 ${i === 0 ? sectionBorder : ''}`}>
                        {col.label}
                      </th>
                    ))}
                    {bottomAllowances.length === 0 && <th className={`${thBase} ${sectionBorder}`}></th>}
                    {padThCells(bottomAllowances.length, payColCount, 'hpad-pay-b')}
                    {bottomDeductions.map((col, i) => (
                      <th key={col.label} className={`${thBase} text-right text-red-500 ${i === 0 ? sectionBorder : ''}`}>
                        {col.label}
                      </th>
                    ))}
                    {bottomDeductions.length === 0 && <th className={`${thBase} ${sectionBorder}`}></th>}
                    {padThCells(bottomDeductions.length, dedColCount, 'hpad-ded-b')}
                  </tr>
                </thead>

                {/* ─── Data rows: one <tbody> per employee for group hover ─── */}
                {employees.map((emp, idx) => (
                  <tbody key={idx} className="group border-b border-gray-200 last:border-b-0">
                    {/* Top row */}
                    <tr className="group-hover:bg-indigo-50/30">
                      <td rowSpan={2} className={`${stickyCol1} bg-white group-hover:bg-indigo-50/30 ${tdBase} text-xs text-gray-500 align-middle`}>
                        {emp.employeeNumber}
                      </td>
                      <td className={`${stickyCol2} bg-white group-hover:bg-indigo-50/30 ${tdBase} font-medium text-gray-800`}>
                        {emp.employeeName}
                      </td>
                      {topAllowances.map((col, i) => (
                        <td key={col.label} className={`${tdBase} text-right ${i === 0 ? sectionBorder : ''}`}>
                          {formatKRW(getPayAmount(emp, col.label))}
                        </td>
                      ))}
                      {topAllowances.length === 0 && <td className={`${tdBase} ${sectionBorder}`}></td>}
                      {padCells(topAllowances.length, payColCount, `pay-t-${idx}`)}
                      <td rowSpan={2} className={`${tdBase} text-right font-semibold text-blue-700 bg-blue-50/50 align-middle`}>
                        {formatKRW(emp.totalPay)}
                      </td>
                      {topDeductions.map((col, i) => (
                        <td key={col.label} className={`${tdBase} text-right text-red-600 ${i === 0 ? sectionBorder : ''}`}>
                          {formatKRW(getDeductionAmount(emp, col.label))}
                        </td>
                      ))}
                      {topDeductions.length === 0 && <td className={`${tdBase} ${sectionBorder}`}></td>}
                      {padCells(topDeductions.length, dedColCount, `ded-t-${idx}`)}
                      <td rowSpan={2} className={`${tdBase} text-right font-semibold text-red-700 bg-red-50/50 align-middle`}>
                        {formatKRW(emp.totalDeduction)}
                      </td>
                      <td rowSpan={2} className={`${tdBase} text-right font-bold text-emerald-700 bg-emerald-50/50 align-middle ${sectionBorder}`}>
                        {formatKRW(emp.netPay)}
                      </td>
                    </tr>
                    {/* Bottom row */}
                    <tr className="group-hover:bg-indigo-50/30">
                      <td className={`${stickyCol2} bg-white group-hover:bg-indigo-50/30 ${tdBase} text-xs text-gray-400`}>
                        {emp.departmentName}
                      </td>
                      {bottomAllowances.map((col, i) => (
                        <td key={col.label} className={`${tdBase} text-right ${i === 0 ? sectionBorder : ''}`}>
                          {formatKRW(getPayAmount(emp, col.label))}
                        </td>
                      ))}
                      {bottomAllowances.length === 0 && <td className={`${tdBase} ${sectionBorder}`}></td>}
                      {padCells(bottomAllowances.length, payColCount, `pay-b-${idx}`)}
                      {bottomDeductions.map((col, i) => (
                        <td key={col.label} className={`${tdBase} text-right text-red-600 ${i === 0 ? sectionBorder : ''}`}>
                          {formatKRW(getDeductionAmount(emp, col.label))}
                        </td>
                      ))}
                      {bottomDeductions.length === 0 && <td className={`${tdBase} ${sectionBorder}`}></td>}
                      {padCells(bottomDeductions.length, dedColCount, `ded-b-${idx}`)}
                    </tr>
                  </tbody>
                ))}

                {/* ─── Footer totals ─── */}
                <tfoot>
                  {/* Top total row */}
                  <tr className="border-t-2 border-gray-400 bg-gray-50 font-semibold">
                    <td rowSpan={2} className={`${stickyCol1} bg-gray-50 ${tdBase} text-sm align-middle`} />
                    <td className={`${stickyCol2} bg-gray-50 ${tdBase} text-sm font-bold`}>
                      합계 ({employees.length}명)
                    </td>
                    {topAllowances.map((col, i) => (
                      <td key={col.label} className={`${tdBase} text-right ${i === 0 ? sectionBorder : ''}`}>
                        {formatKRW(totals.byLabel.get(col.label) ?? 0)}
                      </td>
                    ))}
                    {topAllowances.length === 0 && <td className={`${tdBase} ${sectionBorder}`}></td>}
                    {padCells(topAllowances.length, payColCount, 'ftpad-pay-t')}
                    <td rowSpan={2} className={`${tdBase} text-right bg-blue-50 text-blue-700 font-bold align-middle`}>
                      {formatKRW(totals.totalPay)}
                    </td>
                    {topDeductions.map((col, i) => (
                      <td key={col.label} className={`${tdBase} text-right text-red-600 ${i === 0 ? sectionBorder : ''}`}>
                        {formatKRW(totals.byLabel.get(col.label) ?? 0)}
                      </td>
                    ))}
                    {topDeductions.length === 0 && <td className={`${tdBase} ${sectionBorder}`}></td>}
                    {padCells(topDeductions.length, dedColCount, 'ftpad-ded-t')}
                    <td rowSpan={2} className={`${tdBase} text-right bg-red-50 text-red-700 font-bold align-middle`}>
                      {formatKRW(totals.totalDeduction)}
                    </td>
                    <td rowSpan={2} className={`${tdBase} text-right bg-emerald-50 text-emerald-700 font-bold align-middle ${sectionBorder}`}>
                      {formatKRW(totals.netPay)}
                    </td>
                  </tr>
                  {/* Bottom total row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className={`${stickyCol2} bg-gray-50 ${tdBase}`}></td>
                    {bottomAllowances.map((col, i) => (
                      <td key={col.label} className={`${tdBase} text-right ${i === 0 ? sectionBorder : ''}`}>
                        {formatKRW(totals.byLabel.get(col.label) ?? 0)}
                      </td>
                    ))}
                    {bottomAllowances.length === 0 && <td className={`${tdBase} ${sectionBorder}`}></td>}
                    {padCells(bottomAllowances.length, payColCount, 'ftpad-pay-b')}
                    {bottomDeductions.map((col, i) => (
                      <td key={col.label} className={`${tdBase} text-right text-red-600 ${i === 0 ? sectionBorder : ''}`}>
                        {formatKRW(totals.byLabel.get(col.label) ?? 0)}
                      </td>
                    ))}
                    {bottomDeductions.length === 0 && <td className={`${tdBase} ${sectionBorder}`}></td>}
                    {padCells(bottomDeductions.length, dedColCount, 'ftpad-ded-b')}
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
