'use client';

import { useState, useEffect, useCallback } from 'react';
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
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  nightWorkStartTime: string;
  nightWorkEndTime: string;
  overtimeThresholdMinutes: number;
  monthlyWorkHours: number;
  weeklyHoliday: string;
  weeklyWorkHours: number;
  weeklyOvertimeLimit: number;
  monthlyOvertimeLimit: number;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type PolicyRow = Record<string, unknown>;

/** 출퇴근/휴게/근무일 기반 주/월 소정근로시간 자동계산 */
function calcWeeklyHours(start: string, end: string, breakMin: number, days: number[]) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let dailyMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (dailyMinutes < 0) dailyMinutes += 24 * 60; // overnight
  dailyMinutes -= breakMin;
  if (dailyMinutes < 0) dailyMinutes = 0;
  return Math.round((dailyMinutes * days.length) / 60);
}

function calcMonthlyHours(weeklyHours: number, workDaysCount: number) {
  if (workDaysCount === 0) return 0;
  return Math.round((weeklyHours / workDaysCount) * (365 / 12 / 60) * 60);
}

export default function WorkPolicyPage() {
  const [policies, setPolicies] = useState<WorkPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WorkPolicy | null>(null);
  const [saving, setSaving] = useState(false);

  // 기존 필드
  const [formName, setFormName] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('18:00');
  const [formBreak, setFormBreak] = useState(60);
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formDefault, setFormDefault] = useState(false);

  // 신규 필드
  const [formLateGrace, setFormLateGrace] = useState(0);
  const [formEarlyLeaveGrace, setFormEarlyLeaveGrace] = useState(0);
  const [formNightStart, setFormNightStart] = useState('22:00');
  const [formNightEnd, setFormNightEnd] = useState('06:00');
  const [formOvertimeThreshold, setFormOvertimeThreshold] = useState(480);
  const [formWeeklyHoliday, setFormWeeklyHoliday] = useState('0');
  const [formWeeklyHours, setFormWeeklyHours] = useState(40);
  const [formMonthlyHours, setFormMonthlyHours] = useState(209);
  const [formWeeklyOTLimit, setFormWeeklyOTLimit] = useState(12);
  const [formMonthlyOTLimit, setFormMonthlyOTLimit] = useState(52);

  // dirty flags for auto-calc override
  const [weeklyDirty, setWeeklyDirty] = useState(false);
  const [monthlyDirty, setMonthlyDirty] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  // 출퇴근/휴게/근무일 변경 시 자동 재계산
  const autoCalc = useCallback(() => {
    const autoWeekly = calcWeeklyHours(formStart, formEnd, formBreak, formDays);
    if (!weeklyDirty) setFormWeeklyHours(autoWeekly);
    const weekly = weeklyDirty ? formWeeklyHours : autoWeekly;
    if (!monthlyDirty) {
      setFormMonthlyHours(calcMonthlyHours(weekly, formDays.length));
    }
  }, [formStart, formEnd, formBreak, formDays, weeklyDirty, monthlyDirty, formWeeklyHours]);

  useEffect(() => {
    if (showModal) autoCalc();
  }, [formStart, formEnd, formBreak, formDays, showModal, autoCalc]);

  async function loadPolicies() {
    setLoading(true);
    try {
      const data = await apiGet<{ items: WorkPolicy[] }>('/api/settings/work-policy');
      setPolicies(data.items);
    } catch {
      // handled by error boundary
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormName('');
    setFormStart('09:00');
    setFormEnd('18:00');
    setFormBreak(60);
    setFormDays([1, 2, 3, 4, 5]);
    setFormDefault(false);
    setFormLateGrace(0);
    setFormEarlyLeaveGrace(0);
    setFormNightStart('22:00');
    setFormNightEnd('06:00');
    setFormOvertimeThreshold(480);
    setFormWeeklyHoliday('0');
    setFormWeeklyHours(40);
    setFormMonthlyHours(209);
    setFormWeeklyOTLimit(12);
    setFormMonthlyOTLimit(52);
    setWeeklyDirty(false);
    setMonthlyDirty(false);
  }

  function openCreate() {
    setEditing(null);
    resetForm();
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
    setFormLateGrace(policy.lateGraceMinutes);
    setFormEarlyLeaveGrace(policy.earlyLeaveGraceMinutes);
    setFormNightStart(policy.nightWorkStartTime);
    setFormNightEnd(policy.nightWorkEndTime);
    setFormOvertimeThreshold(policy.overtimeThresholdMinutes);
    setFormWeeklyHoliday(policy.weeklyHoliday);
    setFormWeeklyHours(policy.weeklyWorkHours);
    setFormMonthlyHours(policy.monthlyWorkHours);
    setFormWeeklyOTLimit(policy.weeklyOvertimeLimit);
    setFormMonthlyOTLimit(policy.monthlyOvertimeLimit);
    setWeeklyDirty(true); // 편집 시 기존 값 유지
    setMonthlyDirty(true);
    setShowModal(true);
  }

  function toggleDay(day: number) {
    setFormDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
    setWeeklyDirty(false);
    setMonthlyDirty(false);
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
      lateGraceMinutes: formLateGrace,
      earlyLeaveGraceMinutes: formEarlyLeaveGrace,
      nightWorkStartTime: formNightStart,
      nightWorkEndTime: formNightEnd,
      overtimeThresholdMinutes: formOvertimeThreshold,
      monthlyWorkHours: formMonthlyHours,
      weeklyHoliday: formWeeklyHoliday,
      weeklyWorkHours: formWeeklyHours,
      weeklyOvertimeLimit: formWeeklyOTLimit,
      monthlyOvertimeLimit: formMonthlyOTLimit,
    };
    try {
      if (editing) {
        await apiPut(`/api/settings/work-policy/${editing.id}`, body);
      } else {
        await apiPost('/api/settings/work-policy', body);
      }
      setShowModal(false);
      await loadPolicies();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await apiDelete(`/api/settings/work-policy/${id}`);
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
          {String(row.workDays).split(',').map((d) => DAY_LABELS[Number(d.trim())]).join(', ')}
        </span>
      ),
    },
    {
      key: 'lateGraceMinutes',
      label: '지각유예',
      render: (row: PolicyRow) => <span className="text-xs">{row.lateGraceMinutes as number}분</span>,
    },
    {
      key: 'monthlyWorkHours',
      label: '월소정',
      render: (row: PolicyRow) => <span className="text-xs">{row.monthlyWorkHours as number}h</span>,
    },
    {
      key: 'isDefault',
      label: '기본',
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
      <PageHeader title="근무 정책" subtitle="근무 시간 및 급여/근태 설정을 정책별로 관리합니다.">
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
        <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
          {/* 근무시간 섹션 */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">근무시간</h4>
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
                  onChange={(e) => { setFormStart(e.target.value); setWeeklyDirty(false); setMonthlyDirty(false); }}
                />
                <Input
                  label="퇴근 시간"
                  type="time"
                  value={formEnd}
                  onChange={(e) => { setFormEnd(e.target.value); setWeeklyDirty(false); setMonthlyDirty(false); }}
                />
              </div>
              <Input
                label="휴게 시간 (분)"
                type="number"
                value={String(formBreak)}
                onChange={(e) => { setFormBreak(Number(e.target.value)); setWeeklyDirty(false); setMonthlyDirty(false); }}
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
                          ? 'bg-indigo-600 text-white'
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
          </div>

          {/* 지각/조퇴 유예 섹션 */}
          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">지각/조퇴 유예</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="지각 유예시간 (분)"
                type="number"
                value={String(formLateGrace)}
                onChange={(e) => setFormLateGrace(Number(e.target.value))}
                placeholder="0"
              />
              <Input
                label="조퇴 유예시간 (분)"
                type="number"
                value={String(formEarlyLeaveGrace)}
                onChange={(e) => setFormEarlyLeaveGrace(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              유예시간 내 출근/퇴근은 지각/조퇴로 처리하지 않습니다. 0분이면 유예 없이 즉시 판정됩니다.
            </p>
          </div>

          {/* 야간근로/연장근로 섹션 */}
          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">야간/연장근로</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="야간근로 시작"
                type="time"
                value={formNightStart}
                onChange={(e) => setFormNightStart(e.target.value)}
              />
              <Input
                label="야간근로 종료"
                type="time"
                value={formNightEnd}
                onChange={(e) => setFormNightEnd(e.target.value)}
              />
              <Input
                label="일일 연장근로 기준 (시간)"
                type="number"
                value={String(formOvertimeThreshold / 60)}
                onChange={(e) => setFormOvertimeThreshold(Number(e.target.value) * 60)}
              />
              <div>
                <p className="mb-2 text-xs font-medium text-gray-700">주휴요일</p>
                <div className="flex gap-2">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormWeeklyHoliday(String(i))}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                        Number(formWeeklyHoliday) === i
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 소정근로시간 섹션 */}
          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">소정근로시간</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="주 소정근로시간"
                type="number"
                value={String(formWeeklyHours)}
                onChange={(e) => { setFormWeeklyHours(Number(e.target.value)); setWeeklyDirty(true); }}
              />
              <Input
                label="월 소정근로시간"
                type="number"
                value={String(formMonthlyHours)}
                onChange={(e) => { setFormMonthlyHours(Number(e.target.value)); setMonthlyDirty(true); }}
              />
              <Input
                label="주 연장근로 최대"
                type="number"
                value={String(formWeeklyOTLimit)}
                onChange={(e) => setFormWeeklyOTLimit(Number(e.target.value))}
              />
              <Input
                label="월 연장근로 최대"
                type="number"
                value={String(formMonthlyOTLimit)}
                onChange={(e) => setFormMonthlyOTLimit(Number(e.target.value))}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              출퇴근/휴게/근무일 변경 시 주/월 소정근로시간이 자동 계산됩니다. 직접 수정하면 자동계산이 중지됩니다.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
