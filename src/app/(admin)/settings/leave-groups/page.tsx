'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useLeaveGroups, useLeaveGroupMutations, type LeaveGroupItem } from '@/hooks';

export default function LeaveGroupsPage() {
  const toast = useToast();
  const { groups, isLoading, mutate } = useLeaveGroups();
  const { create, update, remove } = useLeaveGroupMutations();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LeaveGroupItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAllowOveruse, setFormAllowOveruse] = useState(false);
  const [formDescription, setFormDescription] = useState('');

  function openCreate() {
    setEditing(null);
    setFormName('');
    setFormAllowOveruse(false);
    setFormDescription('');
    setShowModal(true);
  }

  function openEdit(group: LeaveGroupItem) {
    setEditing(group);
    setFormName(group.name);
    setFormAllowOveruse(group.allowOveruse);
    setFormDescription(group.description ?? '');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body = { name: formName, allowOveruse: formAllowOveruse, description: formDescription || undefined };
      if (editing) {
        await update(editing.id, body);
        toast.success('휴가 그룹이 수정되었습니다.');
      } else {
        await create(body);
        toast.success('휴가 그룹이 추가되었습니다.');
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
    if (isSystem) { toast.error('시스템 그룹은 삭제할 수 없습니다.'); return; }
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await remove(id);
      toast.success('삭제되었습니다.');
      await mutate();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  }

  const columns = [
    { key: 'name', label: '그룹명', sortable: true },
    {
      key: 'allowOveruse',
      label: '초과 사용',
      render: (row: Record<string, unknown>) =>
        row.allowOveruse ? <Badge variant="warning">허용</Badge> : <Badge variant="gray">제한</Badge>,
    },
    { key: 'description', label: '메모', render: (row: Record<string, unknown>) => (row.description as string) || '-' },
    {
      key: 'isSystem',
      label: '유형',
      render: (row: Record<string, unknown>) =>
        row.isSystem ? <Badge variant="info">시스템</Badge> : <Badge variant="gray">커스텀</Badge>,
    },
    {
      key: 'actions',
      label: '',
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row as unknown as LeaveGroupItem)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
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
    <div>
      <PageHeader title="휴가 그룹" subtitle="휴가 유형을 분류하는 그룹을 관리합니다.">
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4" />그룹 추가</Button>
      </PageHeader>

      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <Spinner text="로딩중..." className="py-12" />
          ) : groups.length === 0 ? (
            <EmptyState title="등록된 휴가 그룹이 없습니다" action={<Button size="sm" onClick={openCreate}>그룹 추가</Button>} />
          ) : (
            <Table columns={columns} data={groups as unknown as Record<string, unknown>[]} />
          )}
        </CardBody>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '휴가 그룹 수정' : '휴가 그룹 추가'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving || !formName}>{saving ? <Spinner size="sm" /> : '저장'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="그룹명" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="예: 연차휴가" disabled={editing?.isSystem} />
          <Checkbox label="초과 사용 허용" checked={formAllowOveruse} onChange={setFormAllowOveruse} />
          <Input label="메모" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="메모 (선택)" />
        </div>
      </Modal>
    </div>
  );
}
