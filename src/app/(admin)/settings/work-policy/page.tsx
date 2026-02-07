'use client';

import { useState, useEffect } from 'react';
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
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

interface WorkPolicy {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workDays: number[];
  isDefault: boolean;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type PolicyRow = Record<string, unknown>;

export default function WorkPolicyPage() {
  const [policies, setPolicies] = useState<WorkPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WorkPolicy | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('18:00');
  const [formBreak, setFormBreak] = useState(60);
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formDefault, setFormDefault] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  async function loadPolicies() {
    setLoading(true);
    try {
      const data = await apiGet<{ items: WorkPolicy[] }>('/api/settings/work-policies');
      setPolicies(data.items);
    } catch {
      // handled by error boundary
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormName('');
    setFormStart('09:00');
    setFormEnd('18:00');
    setFormBreak(60);
    setFormDays([1, 2, 3, 4, 5]);
    setFormDefault(false);
    setShowModal(true);
  }

  function openEdit(policy: WorkPolicy) {
    setEditing(policy);
    setFormName(policy.name);
    setFormStart(policy.startTime);
    setFormEnd(policy.endTime);
    setFormBreak(policy.breakMinutes);
    setFormDays(policy.workDays);
    setFormDefault(policy.isDefault);
    setShowModal(true);
  }

  function toggleDay(day: number) {
    setFormDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      name: formName,
      startTime: formStart,
      endTime: formEnd,
      breakMinutes: formBreak,
      workDays: formDays,
      isDefault: formDefault,
    };
    try {
      if (editing) {
        await apiPut(`/api/settings/work-policies/${editing.id}`, body);
      } else {
        await apiPost('/api/settings/work-policies', body);
      }
      setShowModal(false);
      await loadPolicies();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await apiDelete(`/api/settings/work-policies/${id}`);
    await loadPolicies();
  }

  const columns = [
    { key: 'name', label: '정책명' },
    { key: 'startTime', label: '출근' },
    { key: 'endTime', label: '퇴근' },
    {
      key: 'breakMinutes',
      label: '휴게',
      render: (row: PolicyRow) => <span>{row.breakMinutes as number}분</span>,
    },
    {
      key: 'workDays',
      label: '근무일',
      render: (row: PolicyRow) => (
        <span className="text-xs">
          {(row.workDays as number[]).map((d) => DAY_LABELS[d]).join(', ')}
        </span>
      ),
    },
    {
      key: 'isDefault',
      label: '기본여부',
      render: (row: PolicyRow) =>
        row.isDefault ? <Badge variant="success">기본</Badge> : <span className="text-xs text-gray-400">-</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (row: PolicyRow) => (
        <div className="flex gap-1">
          <button
            onClick={() => openEdit(row as unknown as WorkPolicy)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDelete(row.id as string)}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="근무 정책" subtitle="근무 시간 및 정책을 설정합니다.">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          정책 추가
        </Button>
      </PageHeader>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <Spinner text="로딩중..." className="py-12" />
          ) : policies.length === 0 ? (
            <EmptyState
              title="등록된 근무 정책이 없습니다"
              action={
                <Button size="sm" onClick={openCreate}>
                  정책 추가
                </Button>
              }
            />
          ) : (
            <Table columns={columns} data={policies as unknown as PolicyRow[]} />
          )}
        </CardBody>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '근무 정책 수정' : '근무 정책 추가'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving || !formName}>
              {saving ? <Spinner size="sm" /> : '저장'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="정책명"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="예: 일반 근무"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="출근 시간"
              type="time"
              value={formStart}
              onChange={(e) => setFormStart(e.target.value)}
            />
            <Input
              label="퇴근 시간"
              type="time"
              value={formEnd}
              onChange={(e) => setFormEnd(e.target.value)}
            />
          </div>
          <Input
            label="휴게 시간 (분)"
            type="number"
            value={String(formBreak)}
            onChange={(e) => setFormBreak(Number(e.target.value))}
          />
          <div>
            <p className="mb-2 text-xs font-medium text-gray-700">근무일</p>
            <div className="flex gap-2">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    formDays.includes(i)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Checkbox
            label="기본 정책으로 설정"
            checked={formDefault}
            onChange={setFormDefault}
          />
        </div>
      </Modal>
    </div>
  );
}
