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
  [key: string]: unknown;
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
  metadata?: { salaryType?: string; [key: string]: unknown } | null;
  [key: string]: unknown;
}

interface LedgerData {
  employees: LedgerEmployee[];
}

export default function PayslipsPage() {
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { ledger, isLoading } = usePayrollLedger(year, month);
  const data = ledger as LedgerData | undefined;
  const employees = useMemo(() => data?.employees ?? [], [data]);
  const yearOptions = useMemo(() => generateYearOptions(), []);

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.employeeName.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q),
    );
  }, [employees, search]);

  const selectedEmployee = selectedEmployeeId
    ? employees.find((e) => e.employeeNumber === selectedEmployeeId)
    : filteredEmployees[0] ?? null;

  const payItems = (selectedEmployee?.payItems ?? []).filter((i) => i.amount !== 0);
  const deductionItems = (selectedEmployee?.deductionItems ?? []).filter((i) => i.amount !== 0);

  // 기본급은 payItems에서 추출
  const basePay = (selectedEmployee?.payItems ?? []).find((i) => i.label === '기본급')?.amount ?? 0;

  function getPayBasis(item: LedgerItem): string | null {
    // hours 필드가 있으면 시간 표시 (연장/야간/휴일/시급제 기본급)
    if (item.hours != null) {
      const h = Number(item.hours);
      return h < 1 ? `${Math.round(h * 60)}분` : `${h}시간`;
    }
    // 결근/무급휴가 (description에서 일수 추출)
    if (item.label.includes('결근') || item.label.includes('무급휴가')) {
      const match = String(item.description ?? '').match(/(\d+)일/);
      return match ? `${match[1]}일` : null;
    }
    // 지각/조퇴 (description에서 시간 추출)
    if (item.label.includes('지각') || item.label.includes('조퇴')) {
      const match = String(item.description ?? '').match(/([\d.]+)h/);
      if (match) {
        const h = parseFloat(match[1]);
        return h < 1 ? `${Math.round(h * 60)}분` : `${h}시간`;
      }
    }
    // 시급제 기본급 (description에서 시간 추출)
    if (item.label === '기본급') {
      const match = String(item.description ?? '').match(/([\d.]+)h/);
      return match ? `${parseFloat(match[1])}시간` : null;
    }
    return null;
  }


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
              wrapperClassName="w-28"
            />
            <Select
              label="월"
              options={MONTH_OPTIONS}
              value={String(month)}
              onChange={(v) => setMonth(Number(v))}
              wrapperClassName="w-24"
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
            ) : filteredEmployees.length === 0 ? (
              <EmptyState title="급여명세서가 없습니다" description="급여를 확정하면 명세서가 생성됩니다." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <li key={emp.employeeNumber}>
                    <button
                      onClick={() => setSelectedEmployeeId(emp.employeeNumber)}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-indigo-50 ${
                        selectedEmployee?.employeeNumber === emp.employeeNumber ? 'bg-indigo-50 border-l-2 border-indigo-600' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800">{emp.employeeName}</p>
                      <p className="text-xs text-gray-500">{emp.employeeNumber} / {emp.departmentName || '-'}</p>
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
              <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white rounded-t-xl">
                <h2 className="text-lg font-bold">급여명세서</h2>
                <p className="mt-1 text-sm text-indigo-200">
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
                    <p className="mt-0.5 font-medium text-gray-800">{selectedEmployee.departmentName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">기본급</p>
                    <p className="mt-0.5 font-medium text-gray-800">{formatKRW(basePay)}</p>
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
                      {payItems.map((item, idx) => {
                        const basis = getPayBasis(item);
                        return (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-2">
                            <div className="text-gray-700">{item.label}</div>
                            {basis && <div className="text-[11px] text-gray-400">{basis}</div>}
                          </td>
                          <td className={`py-2 text-right tabular-nums ${item.amount < 0 ? 'text-red-600' : ''}`}>
                            {formatKRW(item.amount)}
                          </td>
                        </tr>
                        );
                      })}
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
                      {deductionItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-2 text-gray-700">{item.label}</td>
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
