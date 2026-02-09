'use client';

import { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiGet } from '@/lib/api';

interface DepartmentAttendance {
  departmentName: string;
  totalEmployees: number;
  avgWorkingHours: number;
  avgOvertimeHours: number;
  absenceRate: number;
  lateCount: number;
}

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

export default function AttendanceReportPage() {
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState(12);
  const [data, setData] = useState<DepartmentAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(() => generateYearOptions(), []);

  useEffect(() => {
    apiGet<{ items: DepartmentAttendance[] }>('/api/reports/attendance', {
      startYear,
      startMonth,
      endYear,
      endMonth,
    })
      .then((res) => setData(res.items))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [startYear, startMonth, endYear, endMonth]);

  const stats = useMemo(() => {
    if (data.length === 0) return { avgWorking: 0, avgOvertime: 0, avgAbsence: 0 };
    const avgWorking = data.reduce((sum, d) => sum + d.avgWorkingHours, 0) / data.length;
    const avgOvertime = data.reduce((sum, d) => sum + d.avgOvertimeHours, 0) / data.length;
    const avgAbsence = data.reduce((sum, d) => sum + d.absenceRate, 0) / data.length;
    return {
      avgWorking: Math.round(avgWorking * 10) / 10,
      avgOvertime: Math.round(avgOvertime * 10) / 10,
      avgAbsence: Math.round(avgAbsence * 10) / 10,
    };
  }, [data]);

  return (
    <div>
      <PageHeader title="근태 리포트" subtitle="근태 관련 리포트를 조회합니다." />

      {/* Period selector */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <Select
              label="시작 연도"
              options={yearOptions}
              value={String(startYear)}
              onChange={(v) => { setStartYear(Number(v)); setLoading(true); }}
              wrapperClassName="w-28"
            />
            <Select
              label="시작 월"
              options={MONTH_OPTIONS}
              value={String(startMonth)}
              onChange={(v) => { setStartMonth(Number(v)); setLoading(true); }}
              wrapperClassName="w-24"
            />
            <span className="pb-2 text-gray-400">~</span>
            <Select
              label="종료 연도"
              options={yearOptions}
              value={String(endYear)}
              onChange={(v) => { setEndYear(Number(v)); setLoading(true); }}
              wrapperClassName="w-28"
            />
            <Select
              label="종료 월"
              options={MONTH_OPTIONS}
              value={String(endMonth)}
              onChange={(v) => { setEndMonth(Number(v)); setLoading(true); }}
              wrapperClassName="w-24"
            />
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="평균 근무시간" value={`${stats.avgWorking}시간`} />
        <StatCard title="평균 초과근무" value={`${stats.avgOvertime}시간`} />
        <StatCard title="평균 결근율" value={`${stats.avgAbsence}%`} />
      </div>

      {/* Department table */}
      <Card>
        <CardHeader>
          <CardTitle>부서별 근태 현황</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <Spinner text="로딩중..." className="py-12" />
          ) : data.length === 0 ? (
            <EmptyState
              title="근태 데이터가 없습니다"
              icon={<Clock className="h-10 w-10" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">부서</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">인원</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">평균 근무시간</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">평균 초과근무</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">결근율</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">지각 건수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row) => (
                    <tr key={row.departmentName} className="hover:bg-indigo-50/30">
                      <td className="px-4 py-3 font-medium">{row.departmentName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.totalEmployees}명</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.avgWorkingHours}시간</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={row.avgOvertimeHours > 12 ? 'font-semibold text-red-600' : ''}>
                          {row.avgOvertimeHours}시간
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={row.absenceRate > 5 ? 'font-semibold text-red-600' : ''}>
                          {row.absenceRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.lateCount}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
