'use client';

import { useState, useMemo } from 'react';
import { FileText, Printer } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePayrollSpreadsheet } from '@/hooks';
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

export default function PayslipsPage() {
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { rows, isLoading } = usePayrollSpreadsheet(year, month);
  const yearOptions = useMemo(() => generateYearOptions(), []);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeNumber.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const selectedEmployee = selectedEmployeeId
    ? rows.find((r) => r.employeeId === selectedEmployeeId)
    : filteredRows[0] ?? null;

  const allowanceItems = selectedEmployee?.items.filter((i) => i.type === 'ALLOWANCE') ?? [];
  const deductionItems = selectedEmployee?.items.filter((i) => i.type === 'DEDUCTION') ?? [];

  return (
    <div>
      <PageHeader title="급여명세서" subtitle="직원별 급여명세서를 조회하고 발송합니다.">
        <Button variant="secondary" disabled>
          <Printer className="h-4 w-4" />
          인쇄
        </Button>
      </PageHeader>

      {/* Controls */}
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
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="이름 또는 사번으로 검색..."
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Employee list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>직원 목록</CardTitle>
          </CardHeader>
          <CardBody className="max-h-[600px] overflow-y-auto p-0">
            {isLoading ? (
              <Spinner text="로딩중..." className="py-8" />
            ) : filteredRows.length === 0 ? (
              <EmptyState title="직원이 없습니다" />
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredRows.map((row) => (
                  <li key={row.employeeId}>
                    <button
                      onClick={() => setSelectedEmployeeId(row.employeeId)}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-purple-50 ${
                        selectedEmployee?.employeeId === row.employeeId ? 'bg-purple-50 border-l-2 border-purple-600' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800">{row.employeeName}</p>
                      <p className="text-xs text-gray-500">{row.employeeNumber} / {row.departmentName ?? '-'}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Pay stub card */}
        <Card className="lg:col-span-2">
          {!selectedEmployee ? (
            <CardBody>
              <EmptyState
                title="직원을 선택하세요"
                description="왼쪽 목록에서 직원을 선택하면 급여명세서가 표시됩니다."
                icon={<FileText className="h-10 w-10" />}
              />
            </CardBody>
          ) : (
            <>
              {/* Header */}
              <div className="border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 text-white rounded-t-xl">
                <h2 className="text-lg font-bold">급여명세서</h2>
                <p className="mt-1 text-sm text-purple-200">
                  {year}년 {month}월
                </p>
              </div>

              <CardBody>
                {/* Employee Info */}
                <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500">이름</p>
                    <p className="mt-0.5 font-medium text-gray-800">{selectedEmployee.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">사번</p>
                    <p className="mt-0.5 font-medium text-gray-800">{selectedEmployee.employeeNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">부서</p>
                    <p className="mt-0.5 font-medium text-gray-800">{selectedEmployee.departmentName ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">기본급</p>
                    <p className="mt-0.5 font-medium text-gray-800">{formatKRW(selectedEmployee.basePay)}</p>
                  </div>
                </div>

                {/* 지급 항목 */}
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-blue-700">지급 항목</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 text-left text-xs font-medium text-gray-500">항목</th>
                        <th className="py-2 text-right text-xs font-medium text-gray-500">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allowanceItems.map((item) => (
                        <tr key={item.code} className="border-b border-gray-100">
                          <td className="py-2 text-gray-700">{item.name}</td>
                          <td className="py-2 text-right tabular-nums">{formatKRW(item.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-blue-200 font-semibold text-blue-700">
                        <td className="py-2">총 지급액</td>
                        <td className="py-2 text-right tabular-nums">{formatKRW(selectedEmployee.totalPay)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 공제 항목 */}
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-red-700">공제 항목</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 text-left text-xs font-medium text-gray-500">항목</th>
                        <th className="py-2 text-right text-xs font-medium text-gray-500">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deductionItems.map((item) => (
                        <tr key={item.code} className="border-b border-gray-100">
                          <td className="py-2 text-gray-700">{item.name}</td>
                          <td className="py-2 text-right tabular-nums text-red-600">{formatKRW(item.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-red-200 font-semibold text-red-700">
                        <td className="py-2">총 공제액</td>
                        <td className="py-2 text-right tabular-nums">{formatKRW(selectedEmployee.totalDeduction)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Pay */}
                <div className="rounded-lg bg-emerald-50 p-4 text-center">
                  <p className="text-sm text-emerald-600">실수령액</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700">
                    {formatKRW(selectedEmployee.netPay)}
                  </p>
                </div>
              </CardBody>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
