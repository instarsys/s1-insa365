'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout';
import {
  Button, Table, Badge, DatePicker, Modal, Input, Select,
  Spinner, EmptyState, useToast,
} from '@/components/ui';
import { useDailyAttendance, useAttendanceMutations } from '@/hooks';
import { ClipboardList, Plus } from 'lucide-react';

function formatTime(time?: string) {
  if (!time) return '-';
  return new Date(time).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function minutesToHours(minutes: number) {
  return (minutes / 60).toFixed(1);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PRESENT': return <Badge variant="success">출근</Badge>;
    case 'ABSENT': return <Badge variant="error">결근</Badge>;
    case 'LATE': return <Badge variant="warning">지각</Badge>;
    case 'EARLY_LEAVE': return <Badge variant="warning">조퇴</Badge>;
    case 'LEAVE': return <Badge variant="info">휴가</Badge>;
    case 'HOLIDAY': return <Badge variant="gray">공휴일</Badge>;
    default: return <Badge variant="gray">{status}</Badge>;
  }
}

export default function DailyAttendancePage() {
  const toast = useToast();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);

  const { attendance, isLoading, mutate } = useDailyAttendance(date);
  const { manualEntry } = useAttendanceMutations();

  // Manual entry form
  const [manualUserId, setManualUserId] = useState('');
  const [manualCheckIn, setManualCheckIn] = useState('');
  const [manualCheckOut, setManualCheckOut] = useState('');
  const [manualStatus, setManualStatus] = useState('PRESENT');
  const [isSaving, setIsSaving] = useState(false);

  const statusOptions = useMemo(() => [
    { value: 'PRESENT', label: '출근' },
    { value: 'ABSENT', label: '결근' },
    { value: 'LATE', label: '지각' },
    { value: 'EARLY_LEAVE', label: '조퇴' },
    { value: 'LEAVE', label: '휴가' },
  ], []);

  const handleManualSave = async () => {
    if (!manualUserId) {
      toast.error('직원을 선택해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await manualEntry({
        userId: manualUserId,
        date,
        checkInTime: manualCheckIn || undefined,
        checkOutTime: manualCheckOut || undefined,
        status: manualStatus,
      });
      toast.success('근태가 수동 입력되었습니다.');
      await mutate();
      setModalOpen(false);
      setManualUserId('');
      setManualCheckIn('');
      setManualCheckOut('');
      setManualStatus('PRESENT');
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'userName', label: '이름', sortable: true },
    {
      key: 'checkInTime',
      label: '출근',
      render: (row: Record<string, unknown>) => formatTime(row.checkInTime as string | undefined),
    },
    {
      key: 'checkOutTime',
      label: '퇴근',
      render: (row: Record<string, unknown>) => formatTime(row.checkOutTime as string | undefined),
    },
    {
      key: 'regularMinutes',
      label: '정규(h)',
      render: (row: Record<string, unknown>) => minutesToHours(row.regularMinutes as number),
    },
    {
      key: 'overtimeMinutes',
      label: '연장(h)',
      render: (row: Record<string, unknown>) => minutesToHours(row.overtimeMinutes as number),
    },
    {
      key: 'nightMinutes',
      label: '야간(h)',
      render: (row: Record<string, unknown>) => minutesToHours(row.nightMinutes as number),
    },
    {
      key: 'status',
      label: '상태',
      render: (row: Record<string, unknown>) => getStatusBadge(row.status as string),
    },
    {
      key: 'isConfirmed',
      label: '확정',
      render: (row: Record<string, unknown>) =>
        row.isConfirmed
          ? <Badge variant="success">확정</Badge>
          : <Badge variant="gray">미확정</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title="일별 근태" subtitle="일별 출퇴근 현황을 확인합니다.">
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          수동 입력
        </Button>
      </PageHeader>

      {/* Date selector */}
      <div className="mb-4">
        <DatePicker
          value={date}
          onChange={(v) => setDate(v)}
          className="w-48"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <Spinner text="근태 데이터를 불러오는 중..." className="py-20" />
      ) : attendance.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="해당 날짜에 근태 기록이 없습니다"
          description="직원들이 출퇴근을 기록하면 여기에 표시됩니다."
        />
      ) : (
        <div className="rounded-lg border border-gray-200">
          <Table
            columns={columns}
            data={attendance as unknown as Record<string, unknown>[]}
          />
        </div>
      )}

      {/* Manual Entry Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="수동 근태 입력"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleManualSave} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="직원 ID"
            placeholder="직원 ID를 입력하세요"
            value={manualUserId}
            onChange={(e) => setManualUserId(e.target.value)}
          />
          <Input
            label="출근 시간"
            type="time"
            value={manualCheckIn}
            onChange={(e) => setManualCheckIn(e.target.value)}
          />
          <Input
            label="퇴근 시간"
            type="time"
            value={manualCheckOut}
            onChange={(e) => setManualCheckOut(e.target.value)}
          />
          <Select
            label="상태"
            options={statusOptions}
            value={manualStatus}
            onChange={setManualStatus}
          />
        </div>
      </Modal>
    </div>
  );
}
