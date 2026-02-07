'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePayrollHistory } from '@/hooks';
import { formatKRW, formatDate } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'gray' }> = {
  DRAFT: { label: '임시', variant: 'gray' },
  CONFIRMED: { label: '확정', variant: 'success' },
  PAID: { label: '지급완료', variant: 'info' },
  FAILED: { label: '오류', variant: 'error' },
  SKIPPED: { label: '스킵', variant: 'warning' },
};

type HistoryRow = Record<string, unknown>;

export default function PayrollHistoryPage() {
  const [page, setPage] = useState(1);
  const { history, isLoading } = usePayrollHistory(page);

  const columns = [
    {
      key: 'period',
      label: '급여월',
      render: (row: HistoryRow) => (
        <span className="font-medium">{row.year as number}년 {row.month as number}월</span>
      ),
    },
    { key: 'totalEmployees', label: '직원수' },
    {
      key: 'totalPay',
      label: '총지급액',
      render: (row: HistoryRow) => (
        <span className="tabular-nums">{formatKRW(row.totalPay as number)}</span>
      ),
    },
    {
      key: 'totalDeduction',
      label: '총공제',
      render: (row: HistoryRow) => (
        <span className="tabular-nums text-red-600">{formatKRW(row.totalDeduction as number)}</span>
      ),
    },
    {
      key: 'totalNetPay',
      label: '총실수령',
      render: (row: HistoryRow) => (
        <span className="font-semibold tabular-nums text-emerald-700">{formatKRW(row.totalNetPay as number)}</span>
      ),
    },
    {
      key: 'status',
      label: '상태',
      render: (row: HistoryRow) => {
        const s = STATUS_MAP[row.status as string] ?? { label: row.status, variant: 'gray' as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: 'confirmedAt',
      label: '확정일',
      render: (row: HistoryRow) =>
        row.confirmedAt ? (
          <span className="text-xs text-gray-500">{formatDate(row.confirmedAt as string)}</span>
        ) : (
          <span className="text-xs text-gray-300">-</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="급여 이력" subtitle="과거 급여 실행 이력을 조회합니다." />

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner text="이력 로딩중..." className="py-12" />
          ) : history.length === 0 ? (
            <EmptyState
              title="급여 이력이 없습니다"
              description="급여를 실행하면 이력이 표시됩니다."
              icon={<History className="h-10 w-10" />}
            />
          ) : (
            <Table columns={columns} data={history as unknown as HistoryRow[]} />
          )}
        </CardBody>
      </Card>

      {history.length > 0 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(history.length / 10) || 1}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
