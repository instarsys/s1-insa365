'use client';

import { useState, useMemo, type ReactNode } from 'react';
import useSWR from 'swr';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { fetcher } from '@/lib/api';
import { useLeaveAccruals, useLeaveAccrualGenerate, type LeaveAccrualItem } from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function LeaveAccrualsPage() {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [deptFilter, setDeptFilter] = useState('');
  const [generating, setGenerating] = useState(false);

  const { accruals, isLoading, mutate } = useLeaveAccruals({ year, departmentId: deptFilter || undefined });
  const { generate } = useLeaveAccrualGenerate();

  const { data: deptData } = useSWR<{ items: { id: string; name: string }[] }>('/api/departments', fetcher);
  const departmentOptions = useMemo(() => [
    { value: '', label: '전체 부서' },
    ...(deptData?.items ?? []).map((d) => ({ value: d.id, label: d.name })),
  ], [deptData]);

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i;
    return { value: String(y), label: `${y}년` };
  });

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generate({ year });
      toast.success(`발생 처리 완료: ${result.generated}건 생성, ${result.skipped}건 스킵`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '발생 처리에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  }

  const columns: { key: string; label: string; sortable?: boolean; render?: (row: Record<string, unknown>) => ReactNode }[] = [
    { key: 'userName', label: '직원', sortable: true },
    { key: 'departmentName', label: '부서', render: (row: Record<string, unknown>) => (row.departmentName as string) || '-' },
    { key: 'joinDate', label: '입사일', render: (row: Record<string, unknown>) => formatDate(row.joinDate as string) },
    {
      key: 'totalAccrualDays',
      label: '총 일수',
      sortable: true,
      render: (row: Record<string, unknown>) => <span className="font-medium">{row.totalAccrualDays as number}일</span>,
    },
    {
      key: 'totalUsedDays',
      label: '사용 일수',
      render: (row: Record<string, unknown>) => `${row.totalUsedDays}일`,
    },
    {
      key: 'totalRemainingDays',
      label: '남은 일수',
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const remaining = row.totalRemainingDays as number;
        return (
          <span className={remaining === 0 ? 'font-semibold text-red-600' : remaining <= 3 ? 'font-medium text-amber-600' : 'text-gray-700'}>
            {remaining}일
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="휴가 발생" subtitle="직원별 연차 발생 현황을 확인하고 규칙 기반으로 발생시킵니다.">
        <Button onClick={handleGenerate} disabled={generating} size="sm">
          {generating ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
          규칙 기반 발생
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select options={yearOptions} value={String(year)} onChange={(v) => setYear(Number(v))} wrapperClassName="w-32" />
        <Select options={departmentOptions} value={deptFilter} onChange={setDeptFilter} wrapperClassName="w-40" />
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner text="로딩중..." className="py-12" />
          ) : accruals.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-12 w-12" />}
              title="발생 이력이 없습니다"
              description="'규칙 기반 발생' 버튼을 눌러 연차를 발생시키세요."
              action={<Button size="sm" onClick={handleGenerate} disabled={generating}>규칙 기반 발생</Button>}
            />
          ) : (
            <Table columns={columns} data={accruals as unknown as Record<string, unknown>[]} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
