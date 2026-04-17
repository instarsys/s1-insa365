'use client';

import { useState, useMemo } from 'react';
import { FileText, Building2, User, Banknote, Shield } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatKRW } from '@/lib/utils';
import { useWithholdingReceipt } from '@/hooks/useTax';
import { useEmployees } from '@/hooks/useEmployees';

const currentYear = new Date().getFullYear();

function generateYearOptions() {
  return [currentYear - 1, currentYear, currentYear + 1].map((y) => ({
    value: String(y),
    label: `${y}년`,
  }));
}

export default function WithholdingReceiptPage() {
  const [year, setYear] = useState(currentYear);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const yearOptions = useMemo(() => generateYearOptions(), []);
  const { employees } = useEmployees({ limit: 500 });
  const employeeOptions = useMemo(() =>
    employees.map((e) => ({
      value: e.id,
      label: `${e.employeeNumber ?? ''} ${e.name}`,
    })),
    [employees],
  );

  const { data, isLoading } = useWithholdingReceipt(year, selectedUserId);

  const thCls = 'px-3 py-2 text-right text-xs font-medium text-gray-500';
  const tdCls = 'px-3 py-2 text-right text-sm tabular-nums';

  return (
    <div>
      <PageHeader title="근로소득 원천징수영수증" subtitle="직원별 연간 원천징수 내역을 조회합니다." />

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-end gap-4">
            <Select label="연도" options={yearOptions} value={String(year)} onChange={(v) => setYear(Number(v))} wrapperClassName="w-28" />
            <Select
              label="직원"
              options={employeeOptions}
              value={selectedUserId ?? ''}
              onChange={(v) => setSelectedUserId(v || null)}
              wrapperClassName="w-64"
              placeholder="직원을 선택하세요"
            />
          </div>
        </CardBody>
      </Card>

      {!selectedUserId ? (
        <Card>
          <CardBody>
            <EmptyState
              title="직원을 선택하세요"
              description="원천징수영수증을 조회할 직원을 선택해주세요."
              icon={<FileText className="h-10 w-10" />}
            />
          </CardBody>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardBody><Spinner text="영수증 데이터 로딩중..." className="py-12" /></CardBody>
        </Card>
      ) : !data ? (
        <Card>
          <CardBody>
            <EmptyState
              title="원천징수 데이터가 없습니다"
              description={`${year}년 해당 직원의 확정된 급여 데이터가 없습니다.`}
              icon={<FileText className="h-10 w-10" />}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* 회사 + 직원 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardBody>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Building2 className="h-4 w-4" />
                  원천징수의무자 (회사)
                </div>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-500">법인명:</span> <span className="font-medium">{data.company.name}</span></div>
                  <div><span className="text-gray-500">사업자번호:</span> <span className="font-medium">{data.company.businessNumber}</span></div>
                  {data.company.corporateRegistrationNumber && (
                    <div><span className="text-gray-500">법인등록번호:</span> <span className="font-medium">{data.company.corporateRegistrationNumber}</span></div>
                  )}
                  <div><span className="text-gray-500">대표자:</span> <span className="font-medium">{data.company.representativeName}</span></div>
                  {data.company.address && <div><span className="text-gray-500">주소:</span> <span className="font-medium">{data.company.address}</span></div>}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <User className="h-4 w-4" />
                  소득자 (직원)
                </div>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-500">성명:</span> <span className="font-medium">{data.employee.name}</span></div>
                  <div><span className="text-gray-500">사번:</span> <span className="font-medium">{data.employee.employeeNumber}</span></div>
                  <div><span className="text-gray-500">주민등록번호:</span> <span className="font-medium">{data.employee.residentNumberMasked || '-'}</span></div>
                  <div><span className="text-gray-500">부서:</span> <span className="font-medium">{data.employee.departmentName || '-'}</span></div>
                  {data.employee.joinDate && <div><span className="text-gray-500">입사일:</span> <span className="font-medium">{data.employee.joinDate.substring(0, 10)}</span></div>}
                  {data.employee.resignDate && <div><span className="text-gray-500">퇴사일:</span> <span className="font-medium">{data.employee.resignDate.substring(0, 10)}</span></div>}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 연간 합계 카드 */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardBody className="text-center">
                <div className="text-xs text-gray-500">연간 총급여</div>
                <div className="mt-1 text-lg font-bold">{formatKRW(data.annual.totalPay)}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <div className="text-xs text-gray-500">연간 과세소득</div>
                <div className="mt-1 text-lg font-bold">{formatKRW(data.annual.taxableIncome)}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <div className="text-xs text-red-500">연간 소득세+지방소득세</div>
                <div className="mt-1 text-lg font-bold text-red-600">{formatKRW(data.annual.incomeTax + data.annual.localIncomeTax)}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <div className="text-xs text-blue-500">연간 4대보험</div>
                <div className="mt-1 text-lg font-bold text-blue-600">
                  {formatKRW(data.annual.nationalPension + data.annual.healthInsurance + data.annual.longTermCare + data.annual.employmentInsurance)}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 월별 상세 내역 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                {year}년 월별 원천징수 내역
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">월</th>
                      <th className={thCls}>총급여</th>
                      <th className={thCls}>비과세</th>
                      <th className={thCls}>과세소득</th>
                      <th className={`${thCls} text-blue-600`}>국민연금</th>
                      <th className={`${thCls} text-blue-600`}>건강보험</th>
                      <th className={`${thCls} text-blue-600`}>장기요양</th>
                      <th className={`${thCls} text-blue-600`}>고용보험</th>
                      <th className={`${thCls} text-red-600`}>소득세</th>
                      <th className={`${thCls} text-red-600`}>지방소득세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.monthly.map((m) => (
                      <tr key={m.month} className="hover:bg-indigo-50/30">
                        <td className="px-3 py-2 font-medium">{m.month}월</td>
                        <td className={tdCls}>{formatKRW(m.totalPay)}</td>
                        <td className={tdCls}>{formatKRW(m.totalNonTaxable)}</td>
                        <td className={tdCls}>{formatKRW(m.taxableIncome)}</td>
                        <td className={`${tdCls} text-blue-600`}>{formatKRW(m.nationalPension)}</td>
                        <td className={`${tdCls} text-blue-600`}>{formatKRW(m.healthInsurance)}</td>
                        <td className={`${tdCls} text-blue-600`}>{formatKRW(m.longTermCare)}</td>
                        <td className={`${tdCls} text-blue-600`}>{formatKRW(m.employmentInsurance)}</td>
                        <td className={`${tdCls} text-red-600`}>{formatKRW(m.incomeTax)}</td>
                        <td className={`${tdCls} text-red-600`}>{formatKRW(m.localIncomeTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                      <td className="px-3 py-2">연간 합계</td>
                      <td className={tdCls}>{formatKRW(data.annual.totalPay)}</td>
                      <td className={tdCls}>{formatKRW(data.annual.totalNonTaxable)}</td>
                      <td className={tdCls}>{formatKRW(data.annual.taxableIncome)}</td>
                      <td className={`${tdCls} text-blue-600`}>{formatKRW(data.annual.nationalPension)}</td>
                      <td className={`${tdCls} text-blue-600`}>{formatKRW(data.annual.healthInsurance)}</td>
                      <td className={`${tdCls} text-blue-600`}>{formatKRW(data.annual.longTermCare)}</td>
                      <td className={`${tdCls} text-blue-600`}>{formatKRW(data.annual.employmentInsurance)}</td>
                      <td className={`${tdCls} text-red-600`}>{formatKRW(data.annual.incomeTax)}</td>
                      <td className={`${tdCls} text-red-600`}>{formatKRW(data.annual.localIncomeTax)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* 4대보험 요약 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                연간 4대보험 납부 내역
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: '국민연금', value: data.annual.nationalPension },
                  { label: '건강보험', value: data.annual.healthInsurance },
                  { label: '장기요양보험', value: data.annual.longTermCare },
                  { label: '고용보험', value: data.annual.employmentInsurance },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-blue-100 bg-blue-50/30 p-3 text-center">
                    <div className="text-xs text-gray-500">{item.label}</div>
                    <div className="mt-1 text-lg font-bold text-blue-700">{formatKRW(item.value)}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
