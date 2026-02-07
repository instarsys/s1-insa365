'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout';
import {
  Button, Table, Badge, Tabs, Modal, Textarea, Spinner, EmptyState, useToast,
} from '@/components/ui';
import { useLeaveRequests, useLeaveMutations } from '@/hooks';
import { formatDate } from '@/lib/utils';
import { CalendarDays, Check, X } from 'lucide-react';

function getLeaveTypeBadge(type: string) {
  switch (type) {
    case 'ANNUAL': return <Badge variant="info">연차</Badge>;
    case 'HALF_DAY': return <Badge variant="info">반차</Badge>;
    case 'SICK': return <Badge variant="warning">병가</Badge>;
    case 'FAMILY_EVENT': return <Badge variant="success">경조사</Badge>;
    case 'UNPAID': return <Badge variant="gray">무급휴가</Badge>;
    case 'OTHER': return <Badge variant="gray">기타</Badge>;
    default: return <Badge variant="gray">{type}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING': return <Badge variant="warning">대기</Badge>;
    case 'APPROVED': return <Badge variant="success">승인</Badge>;
    case 'REJECTED': return <Badge variant="error">반려</Badge>;
    case 'CANCELLED': return <Badge variant="gray">취소</Badge>;
    default: return <Badge variant="gray">{status}</Badge>;
  }
}

export default function LeaveManagementPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const statusFilter = activeTab === 'pending' ? 'PENDING' : undefined;
  const { requests, isLoading, mutate } = useLeaveRequests({ status: statusFilter });
  const { approve, reject } = useLeaveMutations();

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  const tabsWithCount = [
    { key: 'pending', label: '대기', count: activeTab === 'all' ? undefined : pendingCount },
    { key: 'all', label: '전체' },
  ];

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
      await approve(id);
      toast.success('휴가가 승인되었습니다.');
      await mutate();
    } catch {
      toast.error('승인에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      toast.error('반려 사유를 입력해주세요.');
      return;
    }
    setIsProcessing(true);
    try {
      await reject(rejectTargetId, { reason: rejectReason });
      toast.success('휴가가 반려되었습니다.');
      await mutate();
      setRejectModalOpen(false);
    } catch {
      toast.error('반려에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = [
    {
      key: 'createdAt',
      label: '신청일',
      sortable: true,
      render: (row: Record<string, unknown>) => formatDate(row.createdAt as string),
    },
    { key: 'userName', label: '이름' },
    {
      key: 'type',
      label: '유형',
      render: (row: Record<string, unknown>) => getLeaveTypeBadge(row.type as string),
    },
    {
      key: 'startDate',
      label: '시작일',
      render: (row: Record<string, unknown>) => formatDate(row.startDate as string),
    },
    {
      key: 'endDate',
      label: '종료일',
      render: (row: Record<string, unknown>) => formatDate(row.endDate as string),
    },
    {
      key: 'days',
      label: '일수',
      render: (row: Record<string, unknown>) => `${row.days}일`,
    },
    {
      key: 'status',
      label: '상태',
      render: (row: Record<string, unknown>) => getStatusBadge(row.status as string),
    },
    {
      key: 'actions',
      label: '액션',
      render: (row: Record<string, unknown>) => {
        if (row.status !== 'PENDING') return null;
        return (
          <div className="flex gap-1">
            <button
              onClick={() => handleApprove(row.id as string)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
            >
              <Check className="h-3.5 w-3.5" />
              승인
            </button>
            <button
              onClick={() => openRejectModal(row.id as string)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" />
              반려
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="휴가 관리" subtitle="휴가 신청을 승인/반려합니다." />

      <Tabs
        tabs={tabsWithCount}
        activeKey={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {isLoading ? (
        <Spinner text="휴가 목록을 불러오는 중..." className="py-20" />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-12 w-12" />}
          title={activeTab === 'pending' ? '대기 중인 휴가 신청이 없습니다' : '휴가 신청 기록이 없습니다'}
          description="직원이 휴가를 신청하면 여기에 표시됩니다."
        />
      ) : (
        <div className="rounded-lg border border-gray-200">
          <Table
            columns={columns}
            data={requests as unknown as Record<string, unknown>[]}
          />
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="휴가 반려"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              취소
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={isProcessing}>
              {isProcessing ? '처리 중...' : '반려'}
            </Button>
          </>
        }
      >
        <Textarea
          label="반려 사유"
          placeholder="반려 사유를 입력하세요"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={500}
          rows={4}
        />
      </Modal>
    </div>
  );
}
