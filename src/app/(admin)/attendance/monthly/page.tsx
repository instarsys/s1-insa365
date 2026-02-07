'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout';
import {
  Button, Table, Select, Modal, Spinner, EmptyState, useToast,
} from '@/components/ui';
import { useMonthlyAttendance, useAttendanceMutations } from '@/hooks';
import { Calendar, CheckCircle2 } from 'lucide-react';

function minutesToHours(minutes: number) {
  return (minutes / 60).toFixed(1);
}

export default function MonthlyAttendancePage() {
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [departmentId, setDepartmentId] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const { data, isLoading, mutate } = useMonthlyAttendance(year, month, departmentId || undefined);
  const { confirmAttendance } = useAttendanceMutations();

  const items = data?.items ?? [];

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - 2 + i;
    return { value: String(y), label: `${y}년` };
  });

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}월`,
  }));

  const departmentOptions = [
    { value: '', label: '전체 부서' },
  ];

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await confirmAttendance({ year, month });
      toast.success(`${year}년 ${month}월 근태가 일괄 확정되었습니다.`);
      await mutate();
      setConfirmModalOpen(false);
    } catch {
      toast.error('확정에 실패했습니다.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Total row computation
  const totals = items.reduce(
    (acc, item) => ({
      workDays: acc.workDays + item.workDays,
      actualWorkDays: acc.actualWorkDays + item.actualWorkDays,
      absentDays: acc.absentDays + item.absentDays,
      lateDays: acc.lateDays + item.lateDays,
      totalRegularMinutes: acc.totalRegularMinutes + item.totalRegularMinutes,
      totalOvertimeMinutes: acc.totalOvertimeMinutes + item.totalOvertimeMinutes,
      totalNightMinutes: acc.totalNightMinutes + item.totalNightMinutes,
    }),
    { workDays: 0, actualWorkDays: 0, absentDays: 0, lateDays: 0, totalRegularMinutes: 0, totalOvertimeMinutes: 0, totalNightMinutes: 0 },
  );

  const columns = [
    { key: 'userName', label: '이름', sortable: true },
    {
      key: 'departmentName',
      label: '부서',
      render: (row: Record<string, unknown>) => (row.departmentName as string) || '-',
    },
    { key: 'actualWorkDays', label: '근무일' },
    { key: 'absentDays', label: '결근' },
    { key: 'lateDays', label: '지각' },
    {
      key: 'totalRegularMinutes',
      label: '정규시간',
      render: (row: Record<string, unknown>) =>
        minutesToHours(row.totalRegularMinutes as number) + 'h',
    },
    {
      key: 'totalOvertimeMinutes',
      label: '연장시간',
      render: (row: Record<string, unknown>) =>
        minutesToHours(row.totalOvertimeMinutes as number) + 'h',
    },
    {
      key: 'totalNightMinutes',
      label: '야간시간',
      render: (row: Record<string, unknown>) =>
        minutesToHours(row.totalNightMinutes as number) + 'h',
    },
  ];

  return (
    <div>
      <PageHeader title="월별 현황" subtitle="월별 근태 현황을 확인하고 확정합니다.">
        <Button onClick={() => setConfirmModalOpen(true)}>
          <CheckCircle2 className="h-4 w-4" />
          일괄 확정
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          options={yearOptions}
          value={String(year)}
          onChange={(v) => setYear(Number(v))}
        />
        <Select
          options={monthOptions}
          value={String(month)}
          onChange={(v) => setMonth(Number(v))}
        />
        <Select
          options={departmentOptions}
          value={departmentId}
          onChange={setDepartmentId}
          placeholder="전체 부서"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <Spinner text="월별 근태를 불러오는 중..." className="py-20" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="해당 월에 근태 기록이 없습니다"
          description="직원들의 출퇴근 기록이 쌓이면 여기에 요약됩니다."
        />
      ) : (
        <>
          <div className="rounded-lg border border-gray-200">
            <Table
              columns={columns}
              data={items as unknown as Record<string, unknown>[]}
            />
          </div>

          {/* Total row */}
          <div className="mt-2 rounded-lg bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-6 text-sm">
              <span className="font-semibold text-gray-700">합계</span>
              <span className="text-gray-600">근무일: {totals.actualWorkDays}</span>
              <span className="text-gray-600">결근: {totals.absentDays}</span>
              <span className="text-gray-600">지각: {totals.lateDays}</span>
              <span className="text-gray-600">정규: {minutesToHours(totals.totalRegularMinutes)}h</span>
              <span className="text-gray-600">연장: {minutesToHours(totals.totalOvertimeMinutes)}h</span>
              <span className="text-gray-600">야간: {minutesToHours(totals.totalNightMinutes)}h</span>
            </div>
          </div>
        </>
      )}

      {/* Confirm Modal */}
      <Modal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="근태 일괄 확정"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleConfirm} disabled={isConfirming}>
              {isConfirming ? '확정 중...' : '확정'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          {year}년 {month}월의 근태를 일괄 확정하시겠습니까?
        </p>
        <p className="mt-2 text-xs text-gray-400">
          확정 후에는 해당 월의 근태 데이터가 급여 계산용 스냅샷으로 생성됩니다.
          확정된 데이터는 수정할 수 없습니다.
        </p>
      </Modal>
    </div>
  );
}
