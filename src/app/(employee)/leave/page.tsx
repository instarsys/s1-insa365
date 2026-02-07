'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardBody, Badge, Button, Select, DatePicker, Textarea, Modal } from '@/components/ui';
import { useLeaveRequests, useLeaveBalance, useLeaveMutations } from '@/hooks';
import { formatDate } from '@/lib/utils';

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: '연차' },
  { value: 'HALF_AM', label: '반차(오전)' },
  { value: 'HALF_PM', label: '반차(오후)' },
  { value: 'SICK', label: '병가' },
  { value: 'FAMILY', label: '경조사' },
  { value: 'UNPAID', label: '무급휴가' },
  { value: 'OTHER', label: '기타' },
];

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'gray' }> = {
  PENDING: { label: '대기중', variant: 'warning' },
  APPROVED: { label: '승인', variant: 'success' },
  REJECTED: { label: '반려', variant: 'error' },
  CANCELLED: { label: '취소', variant: 'gray' },
};

function getTypeLabel(type: string) {
  return LEAVE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export default function EmployeeLeavePage() {
  const { balance } = useLeaveBalance();
  const { requests, mutate } = useLeaveRequests();
  const { createRequest } = useLeaveMutations();

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('ANNUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isHalfDay = formType === 'HALF_AM' || formType === 'HALF_PM';
  const days = (() => {
    if (isHalfDay) return 0.5;
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(diff, 0);
  })();

  const handleSubmit = async () => {
    if (!startDate) return;
    setSubmitting(true);
    try {
      const effectiveEndDate = isHalfDay ? startDate : endDate;
      await createRequest({ type: formType, startDate, endDate: effectiveEndDate, days, reason });
      setShowForm(false);
      setFormType('ANNUAL');
      setStartDate('');
      setEndDate('');
      setReason('');
      await mutate();
    } catch {
      // Error handled by API client
    } finally {
      setSubmitting(false);
    }
  };

  const totalDays = balance?.totalDays ?? 15;
  const usedDays = balance?.usedDays ?? 0;
  const remainingDays = balance?.remainingDays ?? totalDays - usedDays;
  const usagePercent = totalDays > 0 ? (usedDays / totalDays) * 100 : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">휴가</h1>

      {/* Balance card */}
      <Card className="rounded-2xl">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">잔여 연차</p>
              <p className="mt-0.5">
                <span className="text-2xl font-bold text-purple-600">{remainingDays}일</span>
                <span className="ml-1 text-xs text-gray-400">/ 총 {totalDays}일</span>
              </p>
            </div>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              휴가 신청
            </Button>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-gray-400">{usedDays}일 사용</p>
        </CardBody>
      </Card>

      {/* Leave request modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="휴가 신청">
        <div className="space-y-4">
          <Select
            label="휴가 유형"
            options={LEAVE_TYPES}
            value={formType}
            onChange={(v) => setFormType(v)}
          />
          <DatePicker label="시작일" value={startDate} onChange={(v) => setStartDate(v)} />
          {!isHalfDay && (
            <DatePicker label="종료일" value={endDate} onChange={(v) => setEndDate(v)} />
          )}
          <div>
            <p className="mb-1 text-xs font-medium text-gray-700">일수</p>
            <p className="text-sm font-semibold text-purple-600">{days}일</p>
          </div>
          <Textarea
            label="사유"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="휴가 사유를 입력하세요"
            maxLength={200}
          />
          <Button className="w-full" onClick={handleSubmit} disabled={submitting || !startDate || (!isHalfDay && !endDate)}>
            {submitting ? '신청 중...' : '신청하기'}
          </Button>
        </div>
      </Modal>

      {/* Request history */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-800">신청 내역</p>
        {requests.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">휴가 신청 내역이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => {
              const statusInfo = STATUS_MAP[req.status] ?? { label: req.status, variant: 'gray' as const };
              return (
                <Card key={req.id} className="rounded-2xl">
                  <CardBody className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="info">{getTypeLabel(req.type)}</Badge>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                        <p className="text-xs text-gray-700">
                          {formatDate(req.startDate)}
                          {req.startDate !== req.endDate && ` ~ ${formatDate(req.endDate)}`}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {req.days}일 | {formatDate(req.createdAt)} 신청
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
