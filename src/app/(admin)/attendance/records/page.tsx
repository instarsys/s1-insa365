'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout';
import {
  Button, Table, Badge, Select, SearchInput, Spinner, EmptyState,
  Pagination, Checkbox, useToast,
} from '@/components/ui';
import { AttendanceRecordModal } from '@/components/attendance/AttendanceRecordModal';
import { useAttendanceRecords, useAttendanceMutations } from '@/hooks';
import { fetcher } from '@/lib/api';
import {
  formatTime, minutesToHours, getStatusBadge,
} from '@/lib/attendance-utils';
import { useRouter } from 'next/navigation';
import { CalendarDays, ClipboardList, List, Plus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function getMonthRange(): [string, string] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return [
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0],
  ];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = days[d.getDay()];
  return `${m}/${String(day).padStart(2, '0')} (${dow})`;
}

export default function AttendanceRecordsPage() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  const [defaultStart, defaultEnd] = getMonthRange();
  const [startDate, setStartDate] = useState(dateParam ?? defaultStart);
  const [endDate, setEndDate] = useState(dateParam ?? defaultEnd);
  const [departmentId, setDepartmentId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Selected rows
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalRecord, setModalRecord] = useState<{
    id: string; userId: string; date: string;
    checkInTime?: string | null; checkOutTime?: string | null;
    status: string; isConfirmed: boolean; note?: string | null;
  } | null>(null);

  const { confirmAttendance } = useAttendanceMutations();
  const [isConfirming, setIsConfirming] = useState(false);

  const { data, isLoading, mutate } = useAttendanceRecords(startDate, endDate, {
    departmentId: departmentId || undefined,
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    limit,
    sortKey,
    sortDir,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const summary = data?.summary;

  // Department options
  const { data: deptData } = useSWR<{ items: { id: string; name: string }[] }>('/api/departments', fetcher);
  const departmentOptions = useMemo(() => [
    { value: '', label: '전체 부서' },
    ...(deptData?.items ?? []).map((d) => ({ value: d.id, label: d.name })),
  ], [deptData]);

  const statusOptions = useMemo(() => [
    { value: '', label: '전체 상태' },
    { value: 'ON_TIME', label: '정상 출근' },
    { value: 'LATE', label: '지각' },
    { value: 'EARLY_LEAVE', label: '조퇴' },
    { value: 'ABSENT', label: '결근' },
    { value: 'LEAVE', label: '휴가' },
    { value: 'HOLIDAY', label: '공휴일' },
  ], []);

  const limitOptions = useMemo(() => [
    { value: '10', label: '10건' },
    { value: '25', label: '25건' },
    { value: '50', label: '50건' },
    { value: '100', label: '100건' },
  ], []);

  // Sort handler
  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }, [sortKey]);

  // Checkbox selection
  const allSelected = items.length > 0 && items.every((r) => selectedIds.has(r.id));
  const someSelected = items.some((r) => selectedIds.has(r.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((r) => r.id)));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Row click → modal
  const handleRowClick = (row: Record<string, unknown>) => {
    const r = row as unknown as typeof items[0];
    setModalMode('edit');
    setModalRecord({
      id: r.id,
      userId: r.user?.id ?? r.userId,
      date: r.date,
      checkInTime: r.checkInTime as string | null,
      checkOutTime: r.checkOutTime as string | null,
      status: r.status,
      isConfirmed: r.isConfirmed,
      note: (r as unknown as Record<string, unknown>).note as string | null ?? null,
    });
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setModalMode('create');
    setModalRecord(null);
    setModalOpen(true);
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.size === 0) return;
    setIsConfirming(true);
    try {
      // For simplicity, use the monthly confirm with year/month
      const d = new Date(startDate);
      await confirmAttendance({ year: d.getFullYear(), month: d.getMonth() + 1 });
      toast.success(`${selectedIds.size}건 확정 처리되었습니다.`);
      setSelectedIds(new Set());
      await mutate();
    } catch {
      toast.error('확정에 실패했습니다.');
    } finally {
      setIsConfirming(false);
    }
  };

  const columns = [
    {
      key: 'checkbox',
      label: '',
      render: (row: Record<string, unknown>) => (
        <Checkbox
          checked={selectedIds.has(row.id as string)}
          onChange={() => toggleRow(row.id as string)}
        />
      ),
    },
    {
      key: 'userName',
      label: '직원',
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const user = row.user as { name?: string; employeeNumber?: string } | undefined;
        return (
          <div>
            <span className="font-medium text-gray-800">{user?.name ?? (row.userName as string)}</span>
          </div>
        );
      },
    },
    {
      key: 'departmentName',
      label: '부서',
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const user = row.user as { department?: { name?: string } } | undefined;
        return <span className="text-gray-600">{user?.department?.name ?? '-'}</span>;
      },
    },
    {
      key: 'date',
      label: '날짜',
      sortable: true,
      render: (row: Record<string, unknown>) => formatDate(row.date as string),
    },
    {
      key: 'status',
      label: '상태',
      render: (row: Record<string, unknown>) => getStatusBadge(row.status as string),
    },
    {
      key: 'checkInTime',
      label: '출근',
      sortable: true,
      render: (row: Record<string, unknown>) => formatTime(row.checkInTime as string | undefined),
    },
    {
      key: 'checkOutTime',
      label: '퇴근',
      sortable: true,
      render: (row: Record<string, unknown>) => formatTime(row.checkOutTime as string | undefined),
    },
    {
      key: 'regularMinutes',
      label: '정규(h)',
      render: (row: Record<string, unknown>) => minutesToHours(Number(row.regularMinutes) || 0),
    },
    {
      key: 'overtimeMinutes',
      label: '연장(h)',
      render: (row: Record<string, unknown>) => minutesToHours(Number(row.overtimeMinutes) || 0),
    },
    {
      key: 'nightMinutes',
      label: '야간(h)',
      render: (row: Record<string, unknown>) => minutesToHours(Number(row.nightMinutes) || 0),
    },
    {
      key: 'totalMinutes',
      label: '총(h)',
      sortable: true,
      render: (row: Record<string, unknown>) => minutesToHours(Number(row.totalMinutes) || 0),
    },
    {
      key: 'isConfirmed',
      label: '확정',
      render: (row: Record<string, unknown>) =>
        row.isConfirmed
          ? <Badge variant="success">확정</Badge>
          : <Badge variant="gray">미확정</Badge>,
    },
    {
      key: 'note',
      label: '비고',
      render: (row: Record<string, unknown>) => {
        const note = (row.note as string) || '-';
        return <span className="text-gray-500 truncate max-w-[100px]">{note}</span>;
      },
    },
  ];

  return (
    <div>
      <PageHeader title="목록형 근태" subtitle="출퇴근 기록을 상세 리스트로 조회합니다.">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="h-9 w-36 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="h-9 w-36 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              onClick={() => router.push('/attendance/calendar')}
              className={cn('p-2 rounded-md', 'text-gray-400 hover:text-gray-600')}
              title="달력형"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
            <button
              className={cn('p-2 rounded-md', 'bg-purple-100 text-purple-700')}
              title="목록형"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4" />
            출퇴근기록 추가
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          options={departmentOptions}
          value={departmentId}
          onChange={(v) => { setDepartmentId(v); setPage(1); }}
          wrapperClassName="w-40"
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          wrapperClassName="w-36"
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="직원 검색"
          className="w-48"
        />
        <Select
          options={limitOptions}
          value={String(limit)}
          onChange={(v) => { setLimit(Number(v)); setPage(1); }}
          wrapperClassName="w-28"
        />
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mb-4 flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-5 py-3">
          <span className="text-sm font-semibold text-gray-700">
            총 {data?.total ?? 0}건
          </span>
          <span className="h-4 border-l border-gray-300" />
          <span className="text-sm text-gray-600">
            정규 {minutesToHours(summary.totalRegularMinutes)}h
          </span>
          <span className="text-sm text-gray-600">
            연장 {minutesToHours(summary.totalOvertimeMinutes)}h
          </span>
          <span className="text-sm text-gray-600">
            야간 {minutesToHours(summary.totalNightMinutes)}h
          </span>
          <span className="h-4 border-l border-gray-300" />
          <span className="text-sm font-semibold text-indigo-600">
            총 시간 {minutesToHours(summary.totalMinutes)}h
          </span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <Spinner text="근태 기록을 불러오는 중..." className="py-20" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="해당 기간에 근태 기록이 없습니다"
          description="직원들의 출퇴근 기록이 쌓이면 여기에 표시됩니다."
        />
      ) : (
        <>
          {/* Select-all checkbox header */}
          <div className="mb-1 flex items-center gap-2 px-1">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={toggleAll}
              label={allSelected ? '전체 해제' : '전체 선택'}
            />
          </div>

          <div className="rounded-lg border border-gray-200">
            <Table
              columns={columns}
              data={items as unknown as Record<string, unknown>[]}
              onSort={handleSort}
              sortKey={sortKey}
              sortDir={sortDir}
              onRowClick={handleRowClick}
            />
          </div>

          {/* Bottom bar: selection + pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedIds.size}건 선택됨
                  </span>
                  <Button
                    size="sm"
                    onClick={handleBulkConfirm}
                    disabled={isConfirming}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    {isConfirming ? '확정 중...' : '일괄 확정'}
                  </Button>
                </div>
              )}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* Modal */}
      <AttendanceRecordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={() => { mutate(); setSelectedIds(new Set()); }}
        mode={modalMode}
        record={modalRecord}
      />
    </div>
  );
}
