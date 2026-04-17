'use client';

import { useState, useMemo } from 'react';
import { FileJson, Download, Building2, Users, Banknote } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatKRW } from '@/lib/utils';
import { useWithholdingReturn, useSimplifiedStatement } from '@/hooks/useTax';

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

const HALF_OPTIONS = [
  { value: '1', label: '상반기 (1~6월)' },
  { value: '2', label: '하반기 (7~12월)' },
];

type TabType = 'withholding-return' | 'simplified-statement';

export default function TaxReportsPage() {
  const [tab, setTab] = useState<TabType>('withholding-return');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [half, setHalf] = useState<1 | 2>(new Date().getMonth() < 6 ? 1 : 2);
  const yearOptions = useMemo(() => generateYearOptions(), []);

  const { data: returnData, isLoading: returnLoading } = useWithholdingReturn(year, month);
  const { data: statementData, isLoading: statementLoading } = useSimplifiedStatement(year, half);

  function downloadJson(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'withholding-return', label: '원천징수이행상황신고서' },
    { key: 'simplified-statement', label: '간이지급명세서' },
  ];

  return (
    <div>
      <PageHeader title="신고 데이터" subtitle="세무 신고용 데이터를 조회합니다." />

      {/* 탭 */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 원천징수이행상황신고서 */}
      {tab === 'withholding-return' && (
        <>
          <Card className="mb-6">
            <CardBody>
              <div className="flex items-end gap-4">
                <Select label="연도" options={yearOptions} value={String(year)} onChange={(v) => setYear(Number(v))} wrapperClassName="w-28" />
                <Select label="월" options={MONTH_OPTIONS} value={String(month)} onChange={(v) => setMonth(Number(v))} wrapperClassName="w-24" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{year}년 {month}월 원천징수이행상황신고서</CardTitle>
              {returnData && (
                <Button variant="secondary" onClick={() => downloadJson(returnData, `원천징수이행상황신고서_${year}_${month}.json`)}>
                  <Download className="h-4 w-4" />
                  JSON 다운로드
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {returnLoading ? (
                <Spinner text="데이터 로딩중..." className="py-8" />
              ) : !returnData ? (
                <EmptyState
                  title="신고 데이터가 없습니다"
                  description={`${year}년 ${month}월 확정된 급여 데이터가 없습니다.`}
                  icon={<FileJson className="h-10 w-10" />}
                />
              ) : (
                <div className="space-y-6">
                  {/* 회사 정보 */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Building2 className="h-4 w-4" />
                      원천징수의무자
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">법인명: </span>
                        <span className="font-medium">{returnData.companyName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">사업자번호: </span>
                        <span className="font-medium">{returnData.businessNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">대표자: </span>
                        <span className="font-medium">{returnData.representativeName}</span>
                      </div>
                    </div>
                  </div>

                  {/* A01 근로소득 */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <Users className="h-4 w-4" />
                      A01. 근로소득 (간이세액)
                    </div>
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">인원수</div>
                        <div className="text-lg font-bold">{returnData.a01.headCount}명</div>
                      </div>
                      <div>
                        <div className="text-gray-500">총지급액</div>
                        <div className="text-lg font-bold">{formatKRW(returnData.a01.totalPay)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">과세소득</div>
                        <div className="text-lg font-bold">{formatKRW(returnData.a01.taxableIncome)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">소득세</div>
                        <div className="text-lg font-bold text-red-600">{formatKRW(returnData.a01.incomeTax)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">지방소득세</div>
                        <div className="text-lg font-bold text-red-600">{formatKRW(returnData.a01.localIncomeTax)}</div>
                      </div>
                    </div>
                  </div>

                  {/* 납부세액 */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <Banknote className="h-4 w-4" />
                      납부 내역
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-md bg-white p-3 text-center shadow-sm">
                        <div className="text-xs text-gray-500">납부세액 (소득세+지방소득세)</div>
                        <div className="mt-1 text-xl font-bold text-red-600">{formatKRW(returnData.totalTaxToPay)}</div>
                      </div>
                      <div className="rounded-md bg-white p-3 text-center shadow-sm">
                        <div className="text-xs text-gray-500">4대보험 (근로자+사업주)</div>
                        <div className="mt-1 text-xl font-bold text-blue-600">{formatKRW(returnData.totalInsuranceToPay)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* 간이지급명세서 */}
      {tab === 'simplified-statement' && (
        <>
          <Card className="mb-6">
            <CardBody>
              <div className="flex items-end gap-4">
                <Select label="연도" options={yearOptions} value={String(year)} onChange={(v) => setYear(Number(v))} wrapperClassName="w-28" />
                <Select label="반기" options={HALF_OPTIONS} value={String(half)} onChange={(v) => setHalf(Number(v) as 1 | 2)} wrapperClassName="w-44" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{year}년 {half === 1 ? '상' : '하'}반기 간이지급명세서</CardTitle>
              {statementData && (
                <Button variant="secondary" onClick={() => downloadJson(statementData, `간이지급명세서_${year}_${half === 1 ? '상' : '하'}반기.json`)}>
                  <Download className="h-4 w-4" />
                  JSON 다운로드
                </Button>
              )}
            </CardHeader>
            <CardBody className="p-0">
              {statementLoading ? (
                <Spinner text="데이터 로딩중..." className="py-8" />
              ) : !statementData ? (
                <EmptyState
                  title="명세서 데이터가 없습니다"
                  description={`${year}년 ${half === 1 ? '상' : '하'}반기 확정된 급여 데이터가 없습니다.`}
                  icon={<FileJson className="h-10 w-10" />}
                />
              ) : (
                <>
                  {/* 회사 정보 */}
                  <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center gap-6 text-sm">
                      <span><span className="text-gray-500">법인명:</span> <span className="font-medium">{statementData.companyName}</span></span>
                      <span><span className="text-gray-500">사업자번호:</span> <span className="font-medium">{statementData.businessNumber}</span></span>
                      <span><span className="text-gray-500">기간:</span> <span className="font-medium">{statementData.periodStart} ~ {statementData.periodEnd}</span></span>
                    </div>
                  </div>

                  {/* 직원 테이블 */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">사번</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">주민등록번호</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">총지급액</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">과세소득</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">비과세</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-red-600">소득세</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-red-600">지방소득세</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {statementData.employees.map((emp, idx) => (
                          <tr key={idx} className="hover:bg-indigo-50/30">
                            <td className="px-4 py-2 text-xs text-gray-500">{emp.employeeNumber}</td>
                            <td className="px-4 py-2 font-medium">{emp.employeeName}</td>
                            <td className="px-4 py-2 text-gray-600">{emp.residentNumberMasked || '-'}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatKRW(emp.totalPay)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatKRW(emp.taxableIncome)}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatKRW(emp.totalNonTaxable)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-red-600">{formatKRW(emp.incomeTax)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-red-600">{formatKRW(emp.localIncomeTax)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                          <td className="px-4 py-3" colSpan={3}>합계 ({statementData.employees.length}명)</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatKRW(statementData.totals.totalPay)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatKRW(statementData.totals.taxableIncome)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatKRW(statementData.totals.totalNonTaxable)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-red-600">{formatKRW(statementData.totals.incomeTax)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-red-600">{formatKRW(statementData.totals.localIncomeTax)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
