'use client';

import { useState, useMemo, type ReactNode } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout';
import {
  Button, Table, Badge, Tabs, Modal, Select, Textarea, Spinner, EmptyState, useToast,
} from '@/components/ui';
import { useLeaveRequests, useLeaveBalances, useLeaveMutations, useLeaveHistory } from '@/hooks';
import { LeaveHistoryTypeView } from '@/components/leave/LeaveHistoryTypeView';
import { LeaveHistoryListView } from '@/components/leave/LeaveHistoryListView';
import { LeaveHistoryMonthlyView } from '@/components/leave/LeaveHistoryMonthlyView';
import { LeaveBalanceExpandableTable } from '@/components/leave/LeaveBalanceExpandableTable';
import { LeaveAdjustmentModal } from '@/components/leave/LeaveAdjustmentModal';
import { LeaveGrantModal } from '@/components/leave/LeaveGrantModal';
import { formatDate } from '@/lib/utils';
import { fetcher } from '@/lib/api';
import { CalendarDays, Check, X, Plus } from 'lucide-react';

interface LeaveBalance {
  userId: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
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
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [historyYear, setHistoryYear] = useState(currentYear);
  const [balanceYear, setBalanceYear] = useState(currentYear);
  const [balanceDeptFilter, setBalanceDeptFilter] = useState('');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [grantModalOpen, setGrantModalOpen] = useState(false);

  const statusFilter = activeTab === 'pending' ? 'PENDING' : undefined;
  const { requests, isLoading, mutate } = useLeaveRequests({
    status: statusFilter,
    type: typeFilter || undefined,
    departmentId: deptFilter || undefined,
  });
  const { approve, reject } = useLeaveMutations();
  const { balances: leaveBalancesList, isLoading: balancesLoading, mutate: mutateBalances } = useLeaveBalances();

  // 3뷰 데이터
  const historyView = activeTab === 'byType' ? 'type' : activeTab === 'byList' ? 'list' : activeTab === 'byMonth' ? 'monthly' : null;
  const { data: historyData, isLoading: historyLoading } = useLeaveHistory(
    historyView ? { view: historyView, year: historyYear, departmentId: deptFilter || undefined } : undefined,
  );

  // Department options for filter
  const { data: deptData } = useSWR<{ items: { id: string; name: string }[] }>('/api/departments', fetcher);
  const departmentOptions = useMemo(() => [
    { value: '', label: '전체 부서' },
    ...(deptData?.items ?? []).map((d) => ({ value: d.id, label: d.name })),
  ], [deptData]);

  const leaveTypeOptions = useMemo(() => [
    { value: '', label: '전체 유형' },
    { value: 'ANNUAL', label: '연차' },
    { value: 'HALF_DAY_AM', label: '반차(오전)' },
    { value: 'HALF_DAY_PM', label: '반차(오후)' },
    { value: 'SICK', label: '병가' },
    { value: 'FAMILY_EVENT', label: '경조사' },
    { value: 'UNPAID', label: '무급휴가' },
    { value: 'OTHER', label: '기타' },
  ], []);

  // Fetch all balances
  const { data: balancesData } = useSWR<{ items: LeaveBalance[] }>(
    '/api/leave/balances',
    fetcher,
    { revalidateOnFocus: true },
  );
  const balanceMap = new Map<string, LeaveBalance>();
  for (const b of balancesData?.items ?? []) {
    balanceMap.set(b.userId, b);
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i;
    return { value: String(y), label: `${y}년` };
  });

  const tabsWithCount = [
    { key: 'pending', label: '대기', count: pendingCount || undefined },
    { key: 'byType', label: '유형별' },
    { key: 'byList', label: '목록' },
    { key: 'byMonth', label: '월별' },
    { key: 'balances', label: '연차 관리' },
  ];

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
      await approve(id);
      toast.success('휴가가 승인되었습니다.');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '승인에 실패했습니다.');
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '반려에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns: { key: string; label: string; sortable?: boolean; render?: (row: Record<string, unknown>) => ReactNode }[] = [
    {
      key: 'createdAt',
      label: '신청일',
      sortable: true,
      render: (row: Record<string, unknown>) => formatDate(row.createdAt as string),
    },
    { key: 'userName', label: '이름' },
    {
      key: 'leaveTypeName',
      label: '유형',
      render: (row: Record<string, unknown>) => {
        const config = row.leaveTypeConfig as { name: string } | undefined;
        return <Badge variant="info">{config?.name ?? (row.type as string)}</Badge>;
      },
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
      key: 'remainingDays',
      label: '잔여일수',
      render: (row: Record<string, unknown>) => {
        const userId = row.userId as string;
        const balance = balanceMap.get(userId);
        if (!balance) return <span className="text-gray-400">-</span>;
        const remaining = balance.remainingDays;
        const requestDays = row.days as number;
        const isInsufficient = remaining < requestDays;
        return (
          <span className={isInsufficient ? 'font-medium text-amber-600' : 'text-gray-700'}>
            {remaining}일
            {isInsufficient && (
              <span className="ml-1 text-[10px] text-amber-500">부족</span>
            )}
          </span>
        );
      },
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

  const showPendingOrAll = activeTab === 'pending' || activeTab === 'all';
  const showHistoryViews = activeTab === 'byType' || activeTab === 'byList' || activeTab === 'byMonth';

  return (
    <div>
      <PageHeader title="휴가 관리" subtitle="휴가 신청을 승인/반려하고 내역을 관리합니다.">
        <Button onClick={() => setGrantModalOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          휴가 부여
        </Button>
      </PageHeader>

      <Tabs
        tabs={tabsWithCount}
        activeKey={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {/* Filters */}
      {(showPendingOrAll || showHistoryViews) && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {showPendingOrAll && (
            <Select options={leaveTypeOptions} value={typeFilter} onChange={setTypeFilter} wrapperClassName="w-40" />
          )}
          <Select options={departmentOptions} value={deptFilter} onChange={setDeptFilter} wrapperClassName="w-40" />
          {showHistoryViews && (
            <Select options={yearOptions} value={String(historyYear)} onChange={(v) => setHistoryYear(Number(v))} wrapperClassName="w-32" />
          )}
        </div>
      )}

      {/* 대기 탭 */}
      {showPendingOrAll && (
        isLoading ? (
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
        )
      )}

      {/* 유형별 뷰 */}
      {activeTab === 'byType' && (
        historyLoading ? (
          <Spinner text="내역을 불러오는 중..." className="py-20" />
        ) : (
          <LeaveHistoryTypeView items={(historyData as { items?: Record<string, unknown>[] })?.items as never[] ?? []} />
        )
      )}

      {/* 목록 뷰 */}
      {activeTab === 'byList' && (
        historyLoading ? (
          <Spinner text="내역을 불러오는 중..." className="py-20" />
        ) : (
          <LeaveHistoryListView items={(historyData as { items?: Record<string, unknown>[] })?.items as never[] ?? []} />
        )
      )}

      {/* 월별 뷰 */}
      {activeTab === 'byMonth' && (
        historyLoading ? (
          <Spinner text="내역을 불러오는 중..." className="py-20" />
        ) : (
          <LeaveHistoryMonthlyView items={(historyData as { items?: Record<string, unknown>[] })?.items as never[] ?? []} year={historyYear} />
        )
      )}

      {/* 연차 관리 탭 */}
      {activeTab === 'balances' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select
              options={yearOptions}
              value={String(balanceYear)}
              onChange={(v) => setBalanceYear(Number(v))}
              wrapperClassName="w-32"
            />
            <Select
              options={departmentOptions}
              value={balanceDeptFilter}
              onChange={setBalanceDeptFilter}
              wrapperClassName="w-40"
            />
          </div>
          {balancesLoading ? (
            <Spinner text="연차 정보를 불러오는 중..." className="py-20" />
          ) : leaveBalancesList.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-12 w-12" />}
              title="연차 잔여일수 데이터가 없습니다"
              description="직원의 연차 정보가 등록되면 여기에 표시됩니다."
            />
          ) : (
            <LeaveBalanceExpandableTable
              balances={
                balanceDeptFilter
                  ? leaveBalancesList.filter((b) => b.departmentName === departmentOptions.find((d) => d.value === balanceDeptFilter)?.label)
                  : leaveBalancesList
              }
              year={balanceYear}
              onAdjust={(userId, userName) => {
                setAdjustTarget({ userId, userName });
                setAdjustModalOpen(true);
              }}
            />
          )}
          {adjustTarget && (
            <LeaveAdjustmentModal
              open={adjustModalOpen}
              onClose={() => { setAdjustModalOpen(false); setAdjustTarget(null); }}
              userId={adjustTarget.userId}
              userName={adjustTarget.userName}
              year={balanceYear}
              onSuccess={() => { mutateBalances(); }}
            />
          )}
        </>
      )}

      {/* Grant Leave Modal */}
      <LeaveGrantModal
        open={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        onSuccess={() => { mutate(); mutateBalances(); }}
      />

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
