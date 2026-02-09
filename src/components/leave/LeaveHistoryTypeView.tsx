'use client';

import { Table, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface LeaveHistoryItem {
  id: string;
  userName: string;
  departmentName?: string;
  leaveTypeName: string;
  leaveGroupName?: string;
  startDate: string;
  endDate: string;
  days: number;
  paidHours?: number;
  deductionDays?: number;
  reason?: string;
  status: string;
  [key: string]: unknown;
}

interface LeaveHistoryTypeViewProps {
  items: LeaveHistoryItem[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING': return <Badge variant="warning">대기</Badge>;
    case 'APPROVED': return <Badge variant="success">승인</Badge>;
    case 'REJECTED': return <Badge variant="error">반려</Badge>;
    default: return <Badge variant="gray">{status}</Badge>;
  }
}

export function LeaveHistoryTypeView({ items }: LeaveHistoryTypeViewProps) {
  const columns = [
    { key: 'userName', label: '직원', sortable: true },
    {
      key: 'period',
      label: '휴가 기간',
      render: (row: Record<string, unknown>) => {
        const start = formatDate(row.startDate as string);
        const end = formatDate(row.endDate as string);
        return start === end ? start : `${start} ~ ${end}`;
      },
    },
    { key: 'leaveGroupName', label: '휴가 그룹', render: (row: Record<string, unknown>) => (row.leaveGroupName as string) || '-' },
    { key: 'leaveTypeName', label: '휴가 유형' },
    { key: 'paidHours', label: '유급 시간', render: (row: Record<string, unknown>) => `${row.paidHours ?? 0}h` },
    { key: 'deductionDays', label: '차감 일수', render: (row: Record<string, unknown>) => `${row.deductionDays ?? row.days}일` },
    { key: 'reason', label: '사유', render: (row: Record<string, unknown>) => (row.reason as string) || '-' },
    { key: 'status', label: '상태', render: (row: Record<string, unknown>) => getStatusBadge(row.status as string) },
  ];

  return (
    <div className="rounded-lg border border-gray-200">
      <Table columns={columns} data={items as unknown as Record<string, unknown>[]} />
    </div>
  );
}
