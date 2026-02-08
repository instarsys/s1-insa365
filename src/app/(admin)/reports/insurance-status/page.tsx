'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shield } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatKRW } from '@/lib/utils';
import { apiGet } from '@/lib/api';

interface InsuranceSummary {
  nationalPension: { employeeTotal: number; employerTotal: number; enrolledCount: number };
  healthInsurance: { employeeTotal: number; employerTotal: number; enrolledCount: number };
  longTermCare: { employeeTotal: number; employerTotal: number };
  employmentInsurance: { employeeTotal: number; enrolledCount: number };
}

interface InsuranceResponse {
  year: number;
  month: number;
  summary: InsuranceSummary;
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

function InsuranceCard({ title, employeeTotal, employerTotal, enrolledCount }: {
  title: string;
  employeeTotal: number;
  employerTotal?: number;
  enrolledCount?: number;
}) {
  return (
    <Card>
      <CardBody className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">{title}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">근로자 부담</span>
            <span className="font-medium text-gray-800">{formatKRW(employeeTotal)}</span>
          </div>
          {employerTotal !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">사업자 부담</span>
              <span className="font-medium text-gray-800">{formatKRW(employerTotal)}</span>
            </div>
          )}
          {employerTotal !== undefined && (
            <div className="flex justify-between border-t border-gray-100 pt-2 text-xs">
              <span className="font-medium text-gray-600">합계</span>
              <span className="font-semibold text-purple-600">{formatKRW(employeeTotal + employerTotal)}</span>
            </div>
          )}
          {enrolledCount !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">가입자 수</span>
              <span className="font-medium text-gray-800">{enrolledCount}명</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default function InsuranceStatusReportPage() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<InsuranceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(() => generateYearOptions(), []);

  useEffect(() => {
    setLoading(true);
    apiGet<InsuranceResponse>('/api/reports/insurance-status', { year, month })
      .then((res) => setData(res.summary))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year, month]);

  const totalEmployee = data
    ? data.nationalPension.employeeTotal + data.healthInsurance.employeeTotal + data.longTermCare.employeeTotal + data.employmentInsurance.employeeTotal
    : 0;
  const totalEmployer = data
    ? data.nationalPension.employerTotal + data.healthInsurance.employerTotal + data.longTermCare.employerTotal
    : 0;

  return (
    <div>
      <PageHeader title="4대보험 현황" subtitle="4대 사회보험 납부 현황을 조회합니다." />

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

      {loading ? (
        <Spinner text="로딩중..." className="py-12" />
      ) : !data ? (
        <EmptyState
          title="보험 데이터가 없습니다"
          icon={<Shield className="h-10 w-10" />}
        />
      ) : (
        <>
          {/* Summary totals */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardBody className="p-4 text-center">
                <p className="text-xs text-gray-500">근로자 부담 합계</p>
                <p className="mt-1 text-lg font-bold text-gray-800">{formatKRW(totalEmployee)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <p className="text-xs text-gray-500">사업자 부담 합계</p>
                <p className="mt-1 text-lg font-bold text-gray-800">{formatKRW(totalEmployer)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <p className="text-xs text-gray-500">총 보험료</p>
                <p className="mt-1 text-lg font-bold text-purple-600">{formatKRW(totalEmployee + totalEmployer)}</p>
              </CardBody>
            </Card>
          </div>

          {/* Insurance cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InsuranceCard
              title="국민연금"
              employeeTotal={data.nationalPension.employeeTotal}
              employerTotal={data.nationalPension.employerTotal}
              enrolledCount={data.nationalPension.enrolledCount}
            />
            <InsuranceCard
              title="건강보험"
              employeeTotal={data.healthInsurance.employeeTotal}
              employerTotal={data.healthInsurance.employerTotal}
              enrolledCount={data.healthInsurance.enrolledCount}
            />
            <InsuranceCard
              title="장기요양보험"
              employeeTotal={data.longTermCare.employeeTotal}
              employerTotal={data.longTermCare.employerTotal}
            />
            <InsuranceCard
              title="고용보험"
              employeeTotal={data.employmentInsurance.employeeTotal}
              enrolledCount={data.employmentInsurance.enrolledCount}
            />
          </div>
        </>
      )}
    </div>
  );
}
