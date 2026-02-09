'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout';
import { Button, Select, Spinner, EmptyState, Pagination, useToast } from '@/components/ui';
import { AttendanceCalendarGrid } from '@/components/attendance/AttendanceCalendarGrid';
import { AttendanceRecordModal } from '@/components/attendance/AttendanceRecordModal';
import { useCalendarAttendance } from '@/hooks';
import { fetcher } from '@/lib/api';
import { Checkbox } from '@/components/ui';
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const LATE_THRESHOLDS = [
  { value: '0', label: '지각범위: 사용안함' },
  { value: '5', label: '지각범위: 5분' },
  { value: '10', label: '지각범위: 10분' },
  { value: '15', label: '지각범위: 15분' },
  { value: '20', label: '지각범위: 20분' },
  { value: '30', label: '지각범위: 30분' },
  { value: '60', label: '지각범위: 60분' },
];

const EARLY_LEAVE_THRESHOLDS = [
  { value: '0', label: '조퇴범위: 사용안함' },
  { value: '15', label: '조퇴범위: 15분' },
  { value: '30', label: '조퇴범위: 30분' },
  { value: '60', label: '조퇴범위: 60분' },
];

export default function AttendanceCalendarPage() {
  const router = useRouter();
  const toast = useToast();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [departmentId, setDepartmentId] = useState('');
  const [employeeStatus, setEmployeeStatus] = useState('ACTIVE');
  const [lateThreshold, setLateThreshold] = useState('20');
  const [earlyLeaveThreshold, setEarlyLeaveThreshold] = useState('0');
  const [showLeave, setShowLeave] = useState(true);
  const [colorMode, setColorMode] = useState<'status' | 'department'>('status');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>();
  const [modalDefaultUserId, setModalDefaultUserId] = useState<string | undefined>();
  const [modalRecord, setModalRecord] = useState<{
    id: string; userId: string; date: string;
    checkInTime?: string | null; checkOutTime?: string | null;
    status: string; isConfirmed: boolean; note?: string | null;
  } | null>(null);

  const { data, isLoading, mutate } = useCalendarAttendance(
    year, month, departmentId || undefined, page, limit, employeeStatus,
  );

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

    if (hasData) {
      // Find the attendance record from items
      const emp = data?.items.find((e) => e.userId === userId);
      const att = emp?.attendances[day];
      if (att) {
        setModalMode('edit');
        setModalRecord({
          id: att.id,
          userId,
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
    router.push(`/employees/${userId}`);
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
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4" />
            출퇴근기록 추가
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select options={departmentOptions} value={departmentId} onChange={(v) => { setDepartmentId(v); setPage(1); }} wrapperClassName="w-40" />
        <Select options={employeeStatusOptions} value={employeeStatus} onChange={(v) => { setEmployeeStatus(v); setPage(1); }} wrapperClassName="w-32" />
        <Select options={LATE_THRESHOLDS} value={lateThreshold} onChange={setLateThreshold} wrapperClassName="w-44" />
        <Select options={EARLY_LEAVE_THRESHOLDS} value={earlyLeaveThreshold} onChange={setEarlyLeaveThreshold} wrapperClassName="w-44" />
        <Select options={limitOptions} value={String(limit)} onChange={(v) => { setLimit(Number(v)); setPage(1); }} wrapperClassName="w-24" />
        <div className="ml-auto flex items-center gap-4">
          <Checkbox label="휴가 표시" checked={showLeave} onChange={setShowLeave} />
          <Checkbox label="부서별 색상" checked={colorMode === 'department'} onChange={(v) => setColorMode(v ? 'department' : 'status')} />
        </div>
      </div>

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
            showLeave={showLeave}
            colorMode={colorMode}
            onCellClick={handleCellClick}
            onEmployeeClick={handleEmployeeClick}
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
