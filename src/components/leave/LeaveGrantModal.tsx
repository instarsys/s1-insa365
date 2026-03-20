'use client';

import { useState, useMemo } from 'react';
import { Button, Input, Modal, Select, Textarea, useToast } from '@/components/ui';
import { useEmployees } from '@/hooks/useEmployees';
import { useLeaveTypeConfigs, useLeaveMutations } from '@/hooks/useLeave';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeaveGrantModal({ open, onClose, onSuccess }: Props) {
  const toast = useToast();
  const { employees } = useEmployees({ status: 'ACTIVE', limit: 500 });
  const { typeConfigs } = useLeaveTypeConfigs();
  const { grantLeave } = useLeaveMutations();

  const [userId, setUserId] = useState('');
  const [leaveTypeConfigId, setLeaveTypeConfigId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState('1');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employeeOptions = useMemo(() => [
    { value: '', label: '직원 선택' },
    ...employees.map((e) => ({
      value: e.id,
      label: `${e.name}${e.departmentName ? ` (${e.departmentName})` : ''}`,
    })),
  ], [employees]);

  // ABSENCE 코드 제외, isActive만
  const activeConfigs = typeConfigs.filter((c) => c.isActive && c.code !== 'ABSENCE');
  const typeOptions = useMemo(() => [
    { value: '', label: '휴가 유형 선택' },
    ...activeConfigs.map((c) => ({
      value: c.id,
      label: `${c.name}${c.leaveGroup ? ` (${c.leaveGroup.name})` : ''}`,
    })),
  ], [activeConfigs]);

  const handleSubmit = async () => {
    if (!userId) { toast.error('직원을 선택해주세요.'); return; }
    if (!leaveTypeConfigId) { toast.error('휴가 유형을 선택해주세요.'); return; }
    if (!startDate) { toast.error('시작일을 입력해주세요.'); return; }
    if (!endDate) { toast.error('종료일을 입력해주세요.'); return; }

    const numDays = parseFloat(days);
    if (!numDays || numDays < 0.5) { toast.error('유효한 일수를 입력해주세요. (최소 0.5일)'); return; }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('종료일이 시작일보다 빠를 수 없습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await grantLeave({
        userId,
        leaveTypeConfigId,
        startDate,
        endDate,
        days: numDays,
        reason: reason.trim() || undefined,
      });
      toast.success('휴가가 부여되었습니다.');
      onSuccess();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '휴가 부여에 실패했습니다.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUserId('');
    setLeaveTypeConfigId('');
    setStartDate('');
    setEndDate('');
    setDays('1');
    setReason('');
    onClose();
  };

  // 시작일 변경 시 종료일을 같은 날로 자동 설정 (종료일이 비어있거나 시작일보다 이전이면)
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (!endDate || new Date(endDate) < new Date(value)) {
      setEndDate(value);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="휴가 부여"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : '부여'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          관리자가 직접 휴가를 부여합니다. 승인 절차 없이 즉시 APPROVED 상태로 생성됩니다.
        </p>

        <Select
          label="직원"
          options={employeeOptions}
          value={userId}
          onChange={setUserId}
        />

        <Select
          label="휴가 유형"
          options={typeOptions}
          value={leaveTypeConfigId}
          onChange={setLeaveTypeConfigId}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="시작일"
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
          <Input
            label="종료일"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <Input
          label="일수"
          type="number"
          step="0.5"
          min="0.5"
          placeholder="예: 1"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />

        <Textarea
          label="사유 (선택)"
          placeholder="휴가 부여 사유를 입력하세요"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
        />
      </div>
    </Modal>
  );
}
