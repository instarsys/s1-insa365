'use client';

import { useState } from 'react';
import { History, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { usePayrollHistory, usePayrollMutations } from '@/hooks';
import { useToast } from '@/components/ui';
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
  const { history, isLoading, mutate } = usePayrollHistory(page);
  const mutations = usePayrollMutations();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ year: number; month: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await mutations.cancel({ year: deleteTarget.year, month: deleteTarget.month, force: true });
      toast.success(`${deleteTarget.year}년 ${deleteTarget.month}월 급여 이력이 삭제되었습니다.`);
      setDeleteTarget(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '급여 이력 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  }

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
    {
      key: 'actions',
      label: '',
      render: (row: HistoryRow) => {
        const status = row.status as string;
        if (status !== 'CONFIRMED') return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget({ year: row.year as number, month: row.month as number });
            }}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="급여 이력 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        );
      },
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

      {/* 삭제 확인 모달 */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="급여 이력 삭제"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Spinner size="sm" /> : '삭제하기'}
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <>
            <p className="text-sm text-gray-600">
              <strong>{deleteTarget.year}년 {deleteTarget.month}월</strong> 급여 이력을 삭제하시겠습니까?
            </p>
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <p className="font-medium">삭제 시 다음 데이터가 함께 삭제됩니다:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>급여 이력 (PayrollMonthly)</li>
                <li>급여대장</li>
                <li>급여명세서</li>
              </ul>
              <p className="mt-2">삭제 후 급여 실행을 다시 진행해야 합니다.</p>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
