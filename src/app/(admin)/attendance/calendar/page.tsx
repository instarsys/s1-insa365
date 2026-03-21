'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout';
import { Button, Select, Spinner, EmptyState, Pagination, useToast } from '@/components/ui';
import { AttendanceCalendarGrid } from '@/components/attendance/AttendanceCalendarGrid';
import { AttendanceRecordModal } from '@/components/attendance/AttendanceRecordModal';
import { useCalendarAttendance, useAttendanceMutations } from '@/hooks';
import { usePayrollAttendanceReview, usePayrollSummary, usePayrollMutations } from '@/hooks';
import { fetcher } from '@/lib/api';
import { Checkbox } from '@/components/ui';
import { CalendarDays, ChevronLeft, ChevronRight, List, Maximize2, Minimize2, Plus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';


export default function AttendanceCalendarPage() {
  const router = useRouter();
  const toast = useToast();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [departmentId, setDepartmentId] = useState('');
  const [employeeStatus, setEmployeeStatus] = useState('ACTIVE');
  const [showLeave, setShowLeave] = useState(true);
  const [colorMode, setColorMode] = useState<'status' | 'department'>('status');
  const [compactView, setCompactView] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>();
  const [modalDefaultUserId, setModalDefaultUserId] = useState<string | undefined>();
  const [modalRecord, setModalRecord] = useState<{
    id: string; userId: string; userName?: string; date: string;
    checkInTime?: string | null; checkOutTime?: string | null;
    status: string; isConfirmed: boolean; note?: string | null;
  } | null>(null);

  const { data, isLoading, mutate } = useCalendarAttendance(
    year, month, departmentId || undefined, page, limit, employeeStatus,
  );

  // Payroll attendance review for confirm status
  const { review, mutate: mutateReview } = usePayrollAttendanceReview(year, month);
  const allConfirmed = review ? review.unconfirmedEmployees.length === 0 && review.confirmedCount > 0 : false;

  // Department options
  const { data: deptData } = useSWR<{ items: { id: string; name: string }[] }>('/api/departments', fetcher);
  const departmentOptions = useMemo(() => [
    { value: '', label: '전체 부서' },
    ...(deptData?.items ?? []).map((d) => ({ value: d.id, label: d.name })),
  ], [deptData]);

  // Year/Month options
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - 2 + i;
    return { value: String(y), label: `${y}년` };
  });
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1), label: `${i + 1}월`,
  }));

  const employeeStatusOptions = [
    { value: 'ACTIVE', label: '활성 직원' },
    { value: 'RESIGNED', label: '퇴직 직원' },
  ];

  const limitOptions = [
    { value: '50', label: '50명' },
    { value: '100', label: '100명' },
    { value: '200', label: '200명' },
    { value: '500', label: '500명' },
  ];

  const handleCellClick = (userId: string, day: number, hasData: boolean, recordId?: string) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // 승인된 휴가가 있는 날짜 → 모달 열지 않음
    const leavesMap = (data as unknown as Record<string, unknown>)?.leaves as Record<string, Record<number, { type: string; typeName: string }>> | undefined;
    const leaveInfo = leavesMap?.[userId]?.[day];
    if (leaveInfo && !hasData) {
      toast.info(`${dateStr}은 승인된 휴가(${leaveInfo.typeName})가 있는 날짜입니다.`);
      return;
    }

    if (hasData) {
      // Find the attendance record from items
      const emp = data?.items.find((e) => e.userId === userId);
      const att = emp?.attendances[day];
      if (att) {
        setModalMode('edit');
        setModalRecord({
          id: att.id,
          userId,
          userName: emp?.userName,
          date: dateStr,
          checkInTime: att.checkInTime,
          checkOutTime: att.checkOutTime,
          status: att.status,
          isConfirmed: att.isConfirmed,
          note: att.note,
        });
        setModalDefaultDate(undefined);
        setModalDefaultUserId(undefined);
        setModalOpen(true);
      }
    } else {
      setModalMode('create');
      setModalRecord(null);
      setModalDefaultDate(dateStr);
      setModalDefaultUserId(userId);
      setModalOpen(true);
    }
  };

  const handleEmployeeClick = (userId: string) => {
    router.push(`/employees/${userId}?from=attendance-calendar`);
  };

  const handleAddNew = () => {
    setModalMode('create');
    setModalRecord(null);
    setModalDefaultDate(undefined);
    setModalDefaultUserId(undefined);
    setModalOpen(true);
  };

  return (
    <div>
      <PageHeader title="달력형 근태" subtitle="월간 전직원 출퇴근 현황을 달력 형태로 확인합니다.">
        <div className="flex items-center gap-3">
          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (month === 1) { setYear(year - 1); setMonth(12); }
                else setMonth(month - 1);
                setPage(1);
              }}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[7rem] text-center text-sm font-semibold text-gray-800">
              {year}년 {month}월
            </span>
            <button
              onClick={() => {
                if (month === 12) { setYear(year + 1); setMonth(1); }
                else setMonth(month + 1);
                setPage(1);
              }}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              className={cn('p-2 rounded-md', 'bg-purple-100 text-purple-700')}
              title="달력형"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push('/attendance/records')}
              className={cn('p-2 rounded-md', 'text-gray-400 hover:text-gray-600')}
              title="목록형"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={handleAddNew} disabled={allConfirmed}>
            <Plus className="h-4 w-4" />
            출퇴근기록 추가
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select options={departmentOptions} value={departmentId} onChange={(v) => { setDepartmentId(v); setPage(1); }} wrapperClassName="w-40" />
        <Select options={employeeStatusOptions} value={employeeStatus} onChange={(v) => { setEmployeeStatus(v); setPage(1); }} wrapperClassName="w-32" />
        <Select options={limitOptions} value={String(limit)} onChange={(v) => { setLimit(Number(v)); setPage(1); }} wrapperClassName="w-24" />
        <div className="ml-auto flex items-center gap-4">
          <Checkbox label="휴가 표시" checked={showLeave} onChange={setShowLeave} />
          <Checkbox label="부서별 색상" checked={colorMode === 'department'} onChange={(v) => setColorMode(v ? 'department' : 'status')} />
          <button
            onClick={() => setCompactView(v => !v)}
            className={cn('p-1.5 rounded-md border transition-colors',
              compactView ? 'bg-purple-100 text-purple-700 border-purple-200' : 'text-gray-400 border-gray-200 hover:text-gray-600')}
            title={compactView ? '편한 보기' : '전체 보기'}
          >
            {compactView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 일괄 확정 바 */}
      <AttendanceConfirmBar year={year} month={month} onConfirmed={() => { mutate(); mutateReview(); }} />

      {/* Calendar Grid */}
      {isLoading ? (
        <Spinner text="달력 데이터를 불러오는 중..." className="py-20" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-12 w-12" />}
          title="해당 월에 근태 기록이 없습니다"
          description="직원들이 출퇴근을 기록하면 여기에 표시됩니다."
        />
      ) : (
        <>
          <AttendanceCalendarGrid
            year={year}
            month={month}
            items={data.items}
            dailySummary={data.dailySummary}
            holidays={data.holidays ?? []}
            leaves={(data as unknown as Record<string, unknown>).leaves as Record<string, Record<number, { type: string; typeName: string }>> ?? {}}
            showLeave={showLeave}
            colorMode={colorMode}
            onCellClick={handleCellClick}
            onEmployeeClick={handleEmployeeClick}
            compact={compactView}
          />

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                총 {data.totalEmployees}명 중 {(page - 1) * limit + 1}-{Math.min(page * limit, data.totalEmployees)}명
              </p>
              <Pagination
                currentPage={page}
                totalPages={data.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <AttendanceRecordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={() => mutate()}
        mode={modalMode}
        record={modalRecord}
        defaultDate={modalDefaultDate}
        defaultUserId={modalDefaultUserId}
      />
    </div>
  );
}

// ─── Attendance Confirm Bar ──────────────────────────────────
function AttendanceConfirmBar({ year, month, onConfirmed }: { year: number; month: number; onConfirmed: () => void }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { review, isLoading, mutate: mutateReview } = usePayrollAttendanceReview(year, month);
  const { confirmAttendance, cancelConfirmAttendance } = useAttendanceMutations();
  const { summary: payrollSummary, mutate: mutatePayroll } = usePayrollSummary(year, month);
  const { cancel: cancelPayroll } = usePayrollMutations();
  const isPayrollConfirmed = payrollSummary?.status === 'CONFIRMED';
  const isPayrollPaid = payrollSummary?.status === 'PAID';

  if (isLoading || !review) return null;

  const unconfirmedCount = review.unconfirmedEmployees.length;
  const allConfirmed = unconfirmedCount === 0 && review.confirmedCount > 0;

  async function handleBulkConfirm() {
    setConfirming(true);
    try {
      await confirmAttendance({ year, month });
      onConfirmed();
      mutateReview();
      toast.success(`${year}년 ${month}월 근태가 일괄 확정되었습니다.`);
    } catch {
      toast.error('근태 확정 중 오류가 발생했습니다.');
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancelConfirm() {
    if (isPayrollPaid) {
      toast.error('급여가 지급 완료된 상태입니다. 취소할 수 없습니다.');
      return;
    }

    if (isPayrollConfirmed) {
      if (!confirm(`${year}년 ${month}월 급여가 확정된 상태입니다.\n급여 확정을 먼저 취소한 후 근태 확정을 취소합니다.\n\n계속하시겠습니까?`)) return;

      setCancelling(true);
      try {
        // 1단계: 급여 취소
        await cancelPayroll({ year, month });
        // 2단계: 근태 취소
        await cancelConfirmAttendance({ year, month });
        onConfirmed();
        mutateReview();
        mutatePayroll();
        toast.success('급여 및 근태 확정이 취소되었습니다.');
      } catch (err) {
        const message = err instanceof Error ? err.message : '취소 중 오류가 발생했습니다.';
        toast.error(message);
        mutatePayroll();
      } finally {
        setCancelling(false);
      }
      return;
    }

    // 급여 미확정 — 기존 동작
    if (!confirm(`${year}년 ${month}월 근태 확정을 취소하시겠습니까?\n자동 생성된 결근 기록과 스냅샷이 삭제됩니다.`)) return;
    setCancelling(true);
    try {
      await cancelConfirmAttendance({ year, month });
      onConfirmed();
      mutateReview();
      toast.success(`${year}년 ${month}월 근태 확정이 취소되었습니다.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '근태 확정 취소 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border px-5 py-3">
      <div className="flex items-center gap-2 text-sm">
        {allConfirmed ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="font-medium text-emerald-700">
              {review.confirmedCount}/{review.activeEmployeeCount}명 근태 확정 완료
            </span>
            {isPayrollConfirmed && (
              <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                급여 확정됨
              </span>
            )}
            {isPayrollPaid && (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                급여 지급완료
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-700">
            확정 <strong>{review.confirmedCount}</strong>명 / 미확정 <strong className="text-amber-600">{unconfirmedCount}</strong>명 / 전체 {review.activeEmployeeCount}명
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {allConfirmed && (
          <Button
            onClick={handleCancelConfirm}
            disabled={cancelling || isPayrollPaid}
            size="sm"
            variant="secondary"
          >
            {cancelling ? <Spinner size="sm" /> : null}
            확정 취소
          </Button>
        )}
        <Button
          onClick={handleBulkConfirm}
          disabled={allConfirmed || confirming || review.activeEmployeeCount === 0}
          size="sm"
        >
          {confirming ? <Spinner size="sm" /> : null}
          {year}년 {month}월 일괄 확정
        </Button>
      </div>
    </div>
  );
}
