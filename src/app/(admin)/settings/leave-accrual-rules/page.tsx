'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { useLeaveAccrualRules, useLeaveAccrualRuleMutations, useLeaveGroups, type LeaveAccrualRuleItem } from '@/hooks';
import { AccrualRuleTierEditor, type TierData } from '@/components/leave/AccrualRuleTierEditor';

const BASIS_OPTIONS = [
  { value: 'JOIN_DATE', label: '입사일 기준' },
  { value: 'FISCAL_YEAR', label: '회계연도 기준' },
];

const UNIT_OPTIONS = [
  { value: 'MONTHLY', label: '월 기준 발생' },
  { value: 'YEARLY', label: '연 기준 발생' },
];

export default function LeaveAccrualRulesPage() {
  const toast = useToast();
  const { rules, isLoading, mutate } = useLeaveAccrualRules();
  const { create, update, remove } = useLeaveAccrualRuleMutations();
  const { groups } = useLeaveGroups();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LeaveAccrualRuleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [formName, setFormName] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formBasis, setFormBasis] = useState('JOIN_DATE');
  const [formUnit, setFormUnit] = useState('MONTHLY');
  const [formProRata, setFormProRata] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formTiers, setFormTiers] = useState<TierData[]>([]);

  const groupOptions = groups.map((g) => ({ value: g.id, label: g.name }));

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditing(null);
    setFormName('');
    setFormGroupId(groups[0]?.id ?? '');
    setFormBasis('JOIN_DATE');
    setFormUnit('MONTHLY');
    setFormProRata(false);
    setFormDescription('');
    setFormTiers([]);
    setShowModal(true);
  }

  function openEdit(rule: LeaveAccrualRuleItem) {
    setEditing(rule);
    setFormName(rule.name);
    setFormGroupId(rule.leaveGroupId);
    setFormBasis(rule.accrualBasis);
    setFormUnit(rule.accrualUnit);
    setFormProRata(rule.proRataFirstYear);
    setFormDescription(rule.description ?? '');
    setFormTiers(rule.tiers.map((t) => ({
      serviceMonthFrom: t.serviceMonthFrom,
      serviceMonthTo: t.serviceMonthTo,
      accrualDays: t.accrualDays,
      validMonths: t.validMonths ?? undefined,
      sortOrder: t.sortOrder,
    })));
    setShowModal(true);
  }

  async function handleSave() {
    if (formTiers.length === 0) { toast.error('최소 1개 이상의 단계가 필요합니다.'); return; }
    setSaving(true);
    try {
      const body = {
        name: formName,
        leaveGroupId: formGroupId,
        accrualBasis: formBasis,
        accrualUnit: formUnit,
        proRataFirstYear: formProRata,
        description: formDescription || undefined,
        tiers: formTiers,
      };
      if (editing) {
        await update(editing.id, body);
        toast.success('발생 규칙이 수정되었습니다.');
      } else {
        await create(body);
        toast.success('발생 규칙이 추가되었습니다.');
      }
      setShowModal(false);
      await mutate();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await remove(id);
      toast.success('삭제되었습니다.');
      await mutate();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  }

  return (
    <div>
      <PageHeader title="발생 규칙" subtitle="연차 발생 규칙과 단계를 관리합니다.">
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4" />규칙 추가</Button>
      </PageHeader>

      {isLoading ? (
        <Spinner text="로딩중..." className="py-12" />
      ) : rules.length === 0 ? (
        <Card><CardBody><EmptyState title="등록된 발생 규칙이 없습니다" action={<Button size="sm" onClick={openCreate}>규칙 추가</Button>} /></CardBody></Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardBody className="p-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <button onClick={() => toggleExpand(rule.id)} className="flex items-center gap-2 text-left">
                    {expanded.has(rule.id)
                      ? <ChevronDown className="h-4 w-4 text-gray-400" />
                      : <ChevronRight className="h-4 w-4 text-gray-400" />
                    }
                    <div>
                      <p className="text-sm font-medium text-gray-800">{rule.name}</p>
                      <p className="text-xs text-gray-400">
                        {rule.leaveGroup?.name} | {BASIS_OPTIONS.find((o) => o.value === rule.accrualBasis)?.label} | {UNIT_OPTIONS.find((o) => o.value === rule.accrualUnit)?.label} | {rule.tiers.length}단계
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {rule.proRataFirstYear && <Badge variant="info">일할 계산</Badge>}
                    <button onClick={() => openEdit(rule)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(rule.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {expanded.has(rule.id) && rule.tiers.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="px-2 py-1 text-left">근속 (개월)</th>
                          <th className="px-2 py-1 text-right">발생 일수</th>
                          {rule.accrualUnit === 'MONTHLY' && <th className="px-2 py-1 text-right">유효 개월</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {rule.tiers.map((tier) => (
                          <tr key={tier.id} className="border-t border-gray-50">
                            <td className="px-2 py-1 text-gray-600">{tier.serviceMonthFrom} ~ {tier.serviceMonthTo}</td>
                            <td className="px-2 py-1 text-right font-medium text-indigo-600">{tier.accrualDays}일</td>
                            {rule.accrualUnit === 'MONTHLY' && (
                              <td className="px-2 py-1 text-right text-gray-500">{tier.validMonths ?? '-'}개월</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '발생 규칙 수정' : '발생 규칙 추가'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving || !formName || !formGroupId}>{saving ? <Spinner size="sm" /> : '저장'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="규칙명" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="예: 입사일 기준 연차" />
          <Select label="휴가 그룹" options={groupOptions} value={formGroupId} onChange={setFormGroupId} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="발생 기준" options={BASIS_OPTIONS} value={formBasis} onChange={setFormBasis} />
            <Select label="발생 단위" options={UNIT_OPTIONS} value={formUnit} onChange={setFormUnit} />
          </div>
          <Checkbox label="초년도 일할 계산 적용" checked={formProRata} onChange={setFormProRata} />
          <Textarea label="설명" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="규칙 설명 (선택)" maxLength={500} rows={2} />

          <AccrualRuleTierEditor tiers={formTiers} onChange={setFormTiers} accrualUnit={formUnit} />
        </div>
      </Modal>
    </div>
  );
}
