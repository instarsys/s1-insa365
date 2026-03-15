'use client';

import { useState } from 'react';
import { Button, Input, Modal, Select, Textarea, useToast } from '@/components/ui';
import { useLeaveTypeConfigs } from '@/hooks/useLeave';
import { apiPost } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  year: number;
  onSuccess: () => void;
}

export function LeaveAdjustmentModal({ open, onClose, userId, userName, year, onSuccess }: Props) {
  const toast = useToast();
  const { typeConfigs } = useLeaveTypeConfigs();
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [days, setDays] = useState('');
  const [leaveTypeConfigId, setLeaveTypeConfigId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeConfigs = typeConfigs.filter((c) => c.isActive && c.deductsFromBalance);
  const typeOptions = [
    { value: '', label: '휴가 유형 선택' },
    ...activeConfigs.map((c) => ({ value: c.id, label: c.name })),
  ];

  const handleSubmit = async () => {
    const numDays = parseFloat(days);
    if (!numDays || numDays <= 0) {
      toast.error('유효한 일수를 입력해주세요.');
      return;
    }
    if (!leaveTypeConfigId) {
      toast.error('휴가 유형을 선택해주세요.');
      return;
    }
    if (!reason.trim()) {
      toast.error('사유를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiPost('/api/leave/accrual-records/manual', {
        userId,
        year,
        days: adjustType === 'deduct' ? -numDays : numDays,
        reason: reason.trim(),
        leaveTypeConfigId,
      });
      toast.success(adjustType === 'add' ? `${numDays}일이 추가되었습니다.` : `${numDays}일이 차감되었습니다.`);
      onSuccess();
      handleClose();
    } catch {
      toast.error('보정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAdjustType('add');
    setDays('');
    setLeaveTypeConfigId('');
    setReason('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="연차 보정"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : '적용'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-600">직원: </span>
          <span className="text-sm font-medium">{userName}</span>
          <span className="ml-3 text-sm text-gray-600">연도: </span>
          <span className="text-sm font-medium">{year}년</span>
        </div>

        <Select
          label="보정 유형"
          options={[
            { value: 'add', label: '추가 부여' },
            { value: 'deduct', label: '차감' },
          ]}
          value={adjustType}
          onChange={(v) => setAdjustType(v as 'add' | 'deduct')}
        />

        <Input
          label="일수 (일)"
          type="number"
          step="0.5"
          min="0.5"
          placeholder="예: 3"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />

        <Select
          label="휴가 유형"
          options={typeOptions}
          value={leaveTypeConfigId}
          onChange={setLeaveTypeConfigId}
        />

        <Textarea
          label="사유"
          placeholder="보정 사유를 입력하세요 (필수)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
        />
      </div>
    </Modal>
  );
}
