'use client';

import { useState, type ReactNode } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useLeaveTypeConfigs, useLeaveTypeConfigMutations, useLeaveGroups, type LeaveTypeConfigItem } from '@/hooks';

const TIME_OPTIONS = [
  { value: 'FULL_DAY', label: '하루 종일' },
  { value: 'HALF_DAY', label: '시간 입력' },
  { value: 'HOURS', label: '시간 단위' },
];

export function LeaveTypesTab() {
  const toast = useToast();
  const { typeConfigs, isLoading, mutate } = useLeaveTypeConfigs();
  const { create, update, remove } = useLeaveTypeConfigMutations();
  const { groups } = useLeaveGroups();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LeaveTypeConfigItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formTimeOption, setFormTimeOption] = useState('FULL_DAY');
  const [formPaidHours, setFormPaidHours] = useState(8);
  const [formDeductionDays, setFormDeductionDays] = useState(1);
  const [formDeductsFromBalance, setFormDeductsFromBalance] = useState(true);
  const [formRequiresApproval, setFormRequiresApproval] = useState(true);
  const [formDescription, setFormDescription] = useState('');

  const groupOptions = [
    { value: '', label: '(그룹 없음)' },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ];

  function openCreate() {
    setEditing(null);
    setFormCode('');
    setFormName('');
    setFormGroupId('');
    setFormTimeOption('FULL_DAY');
    setFormPaidHours(8);
    setFormDeductionDays(1);
    setFormDeductsFromBalance(true);
    setFormRequiresApproval(true);
    setFormDescription('');
    setShowModal(true);
  }

  function openEdit(item: LeaveTypeConfigItem) {
    setEditing(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormGroupId(item.leaveGroupId ?? '');
    setFormTimeOption(item.timeOption);
    setFormPaidHours(item.paidHours);
    setFormDeductionDays(item.deductionDays);
    setFormDeductsFromBalance(item.deductsFromBalance);
    setFormRequiresApproval(item.requiresApproval);
    setFormDescription(item.description ?? '');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body = {
        code: formCode,
        name: formName,
        leaveGroupId: formGroupId || undefined,
        timeOption: formTimeOption,
        paidHours: formPaidHours,
        deductionDays: formDeductionDays,
        deductsFromBalance: formDeductsFromBalance,
        requiresApproval: formRequiresApproval,
        description: formDescription || undefined,
      };
      if (editing) {
        await update(editing.id, body);
        toast.success('휴가 유형이 수정되었습니다.');
      } else {
        await create(body);
        toast.success('휴가 유형이 추가되었습니다.');
      }
      setShowModal(false);
      await mutate();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, isSystem: boolean) {
    if (isSystem) { toast.error('시스템 유형은 삭제할 수 없습니다.'); return; }
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await remove(id);
      toast.success('삭제되었습니다.');
      await mutate();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  }

  const columns: { key: string; label: string; sortable?: boolean; render?: (row: Record<string, unknown>) => ReactNode }[] = [
    { key: 'leaveGroupName', label: '휴가 그룹', render: (row: Record<string, unknown>) => {
      const group = (row as unknown as LeaveTypeConfigItem).leaveGroup;
      return group ? group.name : <span className="text-gray-400">-</span>;
    }},
    { key: 'name', label: '유형', sortable: true },
    { key: 'code', label: '코드' },
    { key: 'timeOption', label: '시간 옵션', render: (row: Record<string, unknown>) => TIME_OPTIONS.find((o) => o.value === row.timeOption)?.label ?? (row.timeOption as string) },
    { key: 'paidHours', label: '유급 시간', render: (row: Record<string, unknown>) => `${row.paidHours}h` },
    { key: 'deductionDays', label: '차감 일수', render: (row: Record<string, unknown>) => `${row.deductionDays}일` },
    { key: 'deductsFromBalance', label: '잔여차감', render: (row: Record<string, unknown>) =>
      row.deductsFromBalance ? <Badge variant="info">차감</Badge> : <Badge variant="gray">미차감</Badge>,
    },
    {
      key: 'actions',
      label: '',
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row as unknown as LeaveTypeConfigItem)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => handleDelete(row.id as string, row.isSystem as boolean)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4" />유형 추가</Button>
      </div>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner text="로딩중..." className="py-12" />
          ) : typeConfigs.length === 0 ? (
            <EmptyState title="등록된 휴가 유형이 없습니다" action={<Button size="sm" onClick={openCreate}>유형 추가</Button>} />
          ) : (
            <Table columns={columns} data={typeConfigs as unknown as Record<string, unknown>[]} />
          )}
        </CardBody>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '휴가 유형 수정' : '휴가 유형 추가'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving || !formCode || !formName}>{saving ? <Spinner size="sm" /> : '저장'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="코드" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="예: ANNUAL" disabled={editing?.isSystem} />
            <Input label="유형명" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="예: 연차" />
          </div>
          <Select label="휴가 그룹" options={groupOptions} value={formGroupId} onChange={setFormGroupId} />
          <Select label="시간 옵션" options={TIME_OPTIONS} value={formTimeOption} onChange={setFormTimeOption} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="유급 시간 (h)" type="number" value={String(formPaidHours)} onChange={(e) => setFormPaidHours(Number(e.target.value))} />
              <p className="mt-1 text-xs text-gray-500">유급 휴가 사용 시 지급되는 근무 시간입니다. 시급제 직원은 이 시간 x 시급으로 급여가 계산됩니다.</p>
            </div>
            <Input label="차감 일수" type="number" value={String(formDeductionDays)} onChange={(e) => setFormDeductionDays(Number(e.target.value))} />
          </div>
          <div>
            <Checkbox label="잔여일수에서 차감" checked={formDeductsFromBalance} onChange={setFormDeductsFromBalance} />
            <p className="mt-1 text-xs text-gray-500">체크 시 유급 휴가로 분류되며, 잔여 휴가일수에서 차감됩니다. 미체크 시 무급 휴가로 분류되어 월급제 직원은 일할 공제가 적용됩니다.</p>
          </div>
          <Checkbox label="승인 필요" checked={formRequiresApproval} onChange={setFormRequiresApproval} />
          <Input label="메모" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="메모 (선택)" />
        </div>
      </Modal>
    </>
  );
}
