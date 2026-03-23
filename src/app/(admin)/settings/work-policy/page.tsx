'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Clock, Coffee, DoorOpen, AlertTriangle, Timer, Calculator } from 'lucide-react';
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
import { useToast } from '@/components/ui/Toast';

import { Select } from '@/components/ui/Select';

interface WorkPolicy {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workDays: number[] | string;
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
  checkInAllowedMinutes: number;
  checkOutAllowedMinutes: number;
  overtimeMinThreshold: number;
  overtimeRoundingMinutes: number;
  breakType: string;
  attendanceCalcMode: string;
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
  const toast = useToast();
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

  // 휴게 스케줄 (TIERED/SCHEDULED용)
  const [formBreakSchedule, setFormBreakSchedule] = useState<Record<string, unknown>[]>([]);

  // 출퇴근 허용시간 / 연장근로 / 판정방식
  const [formCheckInAllowed, setFormCheckInAllowed] = useState(30);
  const [formCheckOutAllowed, setFormCheckOutAllowed] = useState(60);
  const [formOTMinThreshold, setFormOTMinThreshold] = useState(0);
  const [formOTRounding, setFormOTRounding] = useState(0);
  const [formBreakType, setFormBreakType] = useState('FIXED');
  const [formCalcMode, setFormCalcMode] = useState('TIME_BASED');

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
    setFormBreakSchedule([]);
    setFormCheckInAllowed(30);
    setFormCheckOutAllowed(60);
    setFormOTMinThreshold(0);
    setFormOTRounding(0);
    setFormBreakType('FIXED');
    setFormCalcMode('TIME_BASED');
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
    setFormDays(
      typeof policy.workDays === 'string'
        ? policy.workDays.split(',').map(Number)
        : policy.workDays,
    );
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
    setFormBreakSchedule(Array.isArray((policy as unknown as Record<string, unknown>).breakSchedule) ? (policy as unknown as Record<string, unknown>).breakSchedule as Record<string, unknown>[] : []);
    setFormCheckInAllowed(policy.checkInAllowedMinutes ?? 30);
    setFormCheckOutAllowed(policy.checkOutAllowedMinutes ?? 60);
    setFormOTMinThreshold(policy.overtimeMinThreshold ?? 0);
    setFormOTRounding(policy.overtimeRoundingMinutes ?? 0);
    setFormBreakType(policy.breakType ?? 'FIXED');
    setFormCalcMode(policy.attendanceCalcMode ?? 'TIME_BASED');
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
      workDays: formDays.join(','),
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
      checkInAllowedMinutes: formCheckInAllowed,
      checkOutAllowedMinutes: formCheckOutAllowed,
      overtimeMinThreshold: formOTMinThreshold,
      overtimeRoundingMinutes: formOTRounding,
      breakType: formBreakType,
      breakSchedule: formBreakType !== 'FIXED' ? formBreakSchedule : null,
      attendanceCalcMode: formCalcMode,
    };
    try {
      if (editing) {
        await apiPut(`/api/settings/work-policy/${editing.id}`, body);
      } else {
        await apiPost('/api/settings/work-policy', body);
      }
      setShowModal(false);
      await loadPolicies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '근무 정책 저장에 실패했습니다.');
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
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving || !formName}>
              {saving ? <Spinner size="sm" /> : '저장'}
            </Button>
          </>
        }
      >
        <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">

          {/* ── 기본 정보 ── */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Input
                label="정책명"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 일반 근무"
              />
            </div>
            <div className="pb-1">
              <Checkbox
                label="기본 정책으로 설정"
                checked={formDefault}
                onChange={setFormDefault}
              />
            </div>
          </div>

          {/* ── 근무시간 + 휴게시간 (2컬럼) ── */}
          <div className="grid grid-cols-2 gap-6">
            {/* 좌: 근무시간 */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/30 p-4 space-y-4">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Clock className="h-4 w-4 text-indigo-500" />
                근무시간
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="출근"
                  type="time"
                  value={formStart}
                  onChange={(e) => { setFormStart(e.target.value); setWeeklyDirty(false); setMonthlyDirty(false); }}
                />
                <Input
                  label="퇴근"
                  type="time"
                  value={formEnd}
                  onChange={(e) => { setFormEnd(e.target.value); setWeeklyDirty(false); setMonthlyDirty(false); }}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-gray-700">근무일</p>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        formDays.includes(i)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-gray-700">주휴요일</p>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormWeeklyHoliday(String(i))}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        Number(formWeeklyHoliday) === i
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 우: 휴게시간 */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/30 p-4 space-y-4">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Coffee className="h-4 w-4 text-amber-500" />
                휴게시간
              </h4>
              <Select
                label="방식"
                options={[
                  { value: 'FIXED', label: '고정 시간' },
                  { value: 'TIERED', label: '근무시간별' },
                  { value: 'SCHEDULED', label: '시간대 지정' },
                ]}
                value={formBreakType}
                onChange={(v) => {
                  setFormBreakType(v);
                  if (v === 'TIERED' && (formBreakSchedule.length === 0 || !('minWorkHours' in (formBreakSchedule[0] ?? {})))) {
                    setFormBreakSchedule([{ minWorkHours: 4, breakMinutes: 30 }, { minWorkHours: 8, breakMinutes: 60 }]);
                  }
                  if (v === 'SCHEDULED' && (formBreakSchedule.length === 0 || !('startTime' in (formBreakSchedule[0] ?? {})))) {
                    setFormBreakSchedule([{ startTime: '12:00', endTime: '13:00' }]);
                  }
                  if (v === 'FIXED') setFormBreakSchedule([]);
                }}
              />
              {formBreakType === 'FIXED' && (
                <Input
                  label="휴게 시간 (분)"
                  type="number"
                  value={String(formBreak)}
                  onChange={(e) => { setFormBreak(Number(e.target.value)); setWeeklyDirty(false); setMonthlyDirty(false); }}
                />
              )}
              {formBreakType === 'TIERED' && (
                <div className="space-y-2">
                  {formBreakSchedule.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5">
                      <input type="number" value={String(tier.minWorkHours ?? 0)} onChange={(e) => { const next = [...formBreakSchedule]; next[idx] = { ...next[idx], minWorkHours: Number(e.target.value) }; setFormBreakSchedule(next); }}
                        className="w-12 rounded border border-gray-300 px-1.5 py-1 text-center text-sm focus:border-indigo-500 focus:outline-none" />
                      <span className="text-xs text-gray-500">시간 이상</span>
                      <input type="number" value={String(tier.breakMinutes ?? 0)} onChange={(e) => { const next = [...formBreakSchedule]; next[idx] = { ...next[idx], breakMinutes: Number(e.target.value) }; setFormBreakSchedule(next); }}
                        className="w-12 rounded border border-gray-300 px-1.5 py-1 text-center text-sm focus:border-indigo-500 focus:outline-none" />
                      <span className="text-xs text-gray-500">분 휴게</span>
                      <div className="flex-1" />
                      {formBreakSchedule.length > 1 && (
                        <button type="button" onClick={() => setFormBreakSchedule(formBreakSchedule.filter((_, i) => i !== idx))} className="rounded p-0.5 text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setFormBreakSchedule([...formBreakSchedule, { minWorkHours: 0, breakMinutes: 0 }])} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"><Plus className="h-3 w-3" /> 조건 추가</button>
                  <p className="text-[11px] text-gray-400">가장 큰 조건의 휴게시간이 적용됩니다.</p>
                </div>
              )}
              {formBreakType === 'SCHEDULED' && (
                <div className="space-y-2">
                  {formBreakSchedule.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5">
                      <input type="time" value={String(slot.startTime ?? '12:00')} onChange={(e) => { const next = [...formBreakSchedule]; next[idx] = { ...next[idx], startTime: e.target.value }; setFormBreakSchedule(next); }}
                        className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none" />
                      <span className="text-xs text-gray-400">~</span>
                      <input type="time" value={String(slot.endTime ?? '13:00')} onChange={(e) => { const next = [...formBreakSchedule]; next[idx] = { ...next[idx], endTime: e.target.value }; setFormBreakSchedule(next); }}
                        className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none" />
                      <div className="flex-1" />
                      {formBreakSchedule.length > 1 && (
                        <button type="button" onClick={() => setFormBreakSchedule(formBreakSchedule.filter((_, i) => i !== idx))} className="rounded p-0.5 text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setFormBreakSchedule([...formBreakSchedule, { startTime: '12:00', endTime: '13:00' }])} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"><Plus className="h-3 w-3" /> 시간대 추가</button>
                  <p className="text-[11px] text-gray-400">겹치는 시간대의 휴게시간이 합산됩니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── 출퇴근 관리 + 지각/조퇴 (2컬럼) ── */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50/30 p-4 space-y-4">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <DoorOpen className="h-4 w-4 text-emerald-500" />
                출퇴근 관리
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Input label="출근 허용 (분 전)" type="number" value={String(formCheckInAllowed)} onChange={(e) => setFormCheckInAllowed(Number(e.target.value))} />
                <Input label="퇴근 허용 (분 후)" type="number" value={String(formCheckOutAllowed)} onChange={(e) => setFormCheckOutAllowed(Number(e.target.value))} />
              </div>
              <Select
                label="판정방식"
                options={[
                  { value: 'TIME_BASED', label: '출퇴근시간 기준' },
                  { value: 'DURATION_BASED', label: '총 근무시간 기준' },
                ]}
                value={formCalcMode}
                onChange={(v) => setFormCalcMode(v)}
              />
              <p className="text-[11px] text-gray-400">출퇴근시간: 지각·연장 각각 계산 / 총 근무시간: 충족하면 미적용</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50/30 p-4 space-y-4">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                지각/조퇴 유예
              </h4>
              <Input label="지각 유예 (분)" type="number" value={String(formLateGrace)} onChange={(e) => setFormLateGrace(Number(e.target.value))} placeholder="0" />
              <Input label="조퇴 유예 (분)" type="number" value={String(formEarlyLeaveGrace)} onChange={(e) => setFormEarlyLeaveGrace(Number(e.target.value))} placeholder="0" />
              <p className="text-[11px] text-gray-400">유예시간 이내면 지각/조퇴 미적용. 0이면 즉시 판정.</p>
            </div>
          </div>

          {/* ── 연장/야간근로 (통합) ── */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/30 p-4 space-y-4">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Timer className="h-4 w-4 text-purple-500" />
              연장/야간근로
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <Input label="야간 시작" type="time" value={formNightStart} onChange={(e) => setFormNightStart(e.target.value)} />
              <Input label="야간 종료" type="time" value={formNightEnd} onChange={(e) => setFormNightEnd(e.target.value)} />
              <Input label="일일 기준 (시간)" type="number" value={String(formOvertimeThreshold / 60)} onChange={(e) => setFormOvertimeThreshold(Number(e.target.value) * 60)} />
              <div />
              <Input label="최소 기준 (분)" type="number" value={String(formOTMinThreshold)} onChange={(e) => setFormOTMinThreshold(Number(e.target.value))} placeholder="0" />
              <Input label="절사 단위 (분)" type="number" value={String(formOTRounding)} onChange={(e) => setFormOTRounding(Number(e.target.value))} placeholder="0" />
            </div>
            <p className="text-[11px] text-gray-400">최소 기준: N분 이상 초과근무 시 연장 인정. 절사: M분 단위 절사. 0이면 미적용.</p>
          </div>

          {/* ── 소정근로시간 (자동계산) ── */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Calculator className="h-4 w-4 text-gray-500" />
              소정근로시간
              <span className="ml-1 text-[11px] font-normal text-gray-400">(출퇴근/휴게/근무일 변경 시 자동계산)</span>
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <Input label="주 소정근로시간" type="number" value={String(formWeeklyHours)} onChange={(e) => { setFormWeeklyHours(Number(e.target.value)); setWeeklyDirty(true); }} />
              <Input label="월 소정근로시간" type="number" value={String(formMonthlyHours)} onChange={(e) => { setFormMonthlyHours(Number(e.target.value)); setMonthlyDirty(true); }} />
              <Input label="주 연장근로 최대" type="number" value={String(formWeeklyOTLimit)} onChange={(e) => setFormWeeklyOTLimit(Number(e.target.value))} />
              <Input label="월 연장근로 최대" type="number" value={String(formMonthlyOTLimit)} onChange={(e) => setFormMonthlyOTLimit(Number(e.target.value))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
