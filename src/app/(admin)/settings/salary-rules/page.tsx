'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Lock, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardBody } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { FormulaEditor } from '@/components/formula/FormulaEditor';
import { FormulaDisplay } from '@/components/formula/FormulaDisplay';
import { formatKRW } from '@/lib/utils';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

interface SalaryRule {
  id: string;
  code: string;
  name: string;
  type: 'ALLOWANCE' | 'DEDUCTION';
  paymentType: string;
  paymentCycle: string;
  defaultAmount: number;
  isOrdinaryWage: boolean;
  isTaxExempt: boolean;
  taxExemptCode?: string;
  formula?: string;
  sortOrder: number;
  isSystemManaged?: boolean;
}

const PAYMENT_TYPE_OPTIONS = [
  { value: 'FIXED', label: '정액' },
  { value: 'FORMULA', label: '산식' },
];

const PAYMENT_CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: '월' },
  { value: 'BIMONTHLY', label: '격월' },
  { value: 'QUARTERLY', label: '분기' },
  { value: 'YEARLY', label: '연' },
];

const TAX_EXEMPT_OPTIONS = [
  { value: '', label: '없음' },
  { value: 'MEALS', label: '식대' },
  { value: 'VEHICLE', label: '차량유지비' },
  { value: 'CHILDCARE', label: '보육수당' },
  { value: 'OTHER', label: '기타' },
];

type RuleRow = Record<string, unknown>;

export default function SalaryRulesPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<string>('ALLOWANCE');
  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState<SalaryRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [showBulkSyncModal, setShowBulkSyncModal] = useState(false);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formPaymentType, setFormPaymentType] = useState('FIXED');
  const [formPaymentCycle, setFormPaymentCycle] = useState('MONTHLY');
  const [formDefaultAmount, setFormDefaultAmount] = useState(0);
  const [formOrdinaryWage, setFormOrdinaryWage] = useState(false);
  const [formTaxExempt, setFormTaxExempt] = useState(false);
  const [formTaxExemptCode, setFormTaxExemptCode] = useState('');
  const [formFormula, setFormFormula] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const data = await apiGet<{ items: SalaryRule[] }>('/api/settings/salary-rules');
      setRules(data.items);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  const filteredRules = rules.filter((r) => r.type === activeTab);

  function openCreate() {
    setEditing(null);
    setFormCode('');
    setFormName('');
    setFormPaymentType('FIXED');
    setFormPaymentCycle('MONTHLY');
    setFormDefaultAmount(0);
    setFormOrdinaryWage(false);
    setFormTaxExempt(false);
    setFormTaxExemptCode('');
    setFormFormula('');
    setFormSortOrder(filteredRules.length);
    setShowPanel(true);
  }

  function openEdit(rule: SalaryRule) {
    setEditing(rule);
    setFormCode(rule.code);
    setFormName(rule.name);
    setFormPaymentType(rule.paymentType);
    setFormPaymentCycle(rule.paymentCycle);
    setFormDefaultAmount(rule.defaultAmount);
    setFormOrdinaryWage(rule.isOrdinaryWage);
    setFormTaxExempt(rule.isTaxExempt);
    setFormTaxExemptCode(rule.taxExemptCode ?? '');
    setFormFormula(rule.formula ?? '');
    setFormSortOrder(rule.sortOrder);
    setShowPanel(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      code: formCode,
      name: formName,
      type: activeTab,
      paymentType: formPaymentType,
      paymentCycle: formPaymentCycle,
      defaultAmount: formDefaultAmount,
      isOrdinaryWage: formOrdinaryWage,
      isTaxExempt: formTaxExempt,
      taxExemptCode: formTaxExemptCode || undefined,
      formula: formFormula || undefined,
      sortOrder: formSortOrder,
    };
    try {
      if (editing) {
        await apiPut(`/api/settings/salary-rules/${editing.id}`, body);
      } else {
        await apiPost('/api/settings/salary-rules', body);
      }
      setShowPanel(false);
      await loadRules();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await apiDelete(`/api/settings/salary-rules/${id}`);
    await loadRules();
  }

  async function handleBulkSync() {
    setIsBulkSyncing(true);
    setShowBulkSyncModal(false);
    try {
      const result = await apiPost<{ totalEmployees: number; created: number; updated: number }>(
        '/api/settings/salary-rules/sync',
        {},
      );
      toast.success(`${result.totalEmployees}명 직원 동기화 완료 (${result.created}개 추가, ${result.updated}개 업데이트)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast.error(msg ? `동기화에 실패했습니다: ${msg}` : '동기화에 실패했습니다.');
    } finally {
      setIsBulkSyncing(false);
    }
  }

  const columns = [
    {
      key: 'code',
      label: '코드',
      render: (row: RuleRow) => (
        <div className="flex items-center gap-1.5">
          <span>{row.code as string}</span>
          {Boolean(row.isSystemManaged) && (
            <span className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              <Lock className="h-2.5 w-2.5" />
              법정
            </span>
          )}
        </div>
      ),
    },
    { key: 'name', label: '항목명' },
    {
      key: 'paymentType',
      label: '구분',
      render: (row: RuleRow) => (
        <Badge variant={row.paymentType === 'FORMULA' ? 'info' : 'gray'}>
          {row.paymentType === 'FORMULA' ? '산식' : '정액'}
        </Badge>
      ),
    },
    {
      key: 'formula',
      label: '산식',
      render: (row: RuleRow) => {
        const formula = row.formula as string | undefined;
        if (!formula) return <span className="text-xs text-gray-300">-</span>;
        return <FormulaDisplay formula={formula} />;
      },
    },
    {
      key: 'defaultAmount',
      label: '기본금액',
      render: (row: RuleRow) => (
        <span className="tabular-nums">{formatKRW(row.defaultAmount as number)}</span>
      ),
    },
    {
      key: 'isOrdinaryWage',
      label: '통상임금',
      render: (row: RuleRow) =>
        row.isOrdinaryWage ? <Badge variant="success">Y</Badge> : <span className="text-xs text-gray-300">-</span>,
    },
    {
      key: 'isTaxExempt',
      label: '비과세',
      render: (row: RuleRow) =>
        row.isTaxExempt ? <Badge variant="warning">Y</Badge> : <span className="text-xs text-gray-300">-</span>,
    },
    { key: 'sortOrder', label: '순서' },
    {
      key: 'actions',
      label: '',
      render: (row: RuleRow) => {
        const locked = row.isSystemManaged as boolean;
        if (locked) {
          return (
            <span className="text-xs text-gray-300" title="시스템 관리 항목">
              <Lock className="h-3.5 w-3.5" />
            </span>
          );
        }
        return (
          <div className="flex gap-1">
            <button
              onClick={() => openEdit(row as unknown as SalaryRule)}
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
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="급여 규칙" subtitle="수당/공제 규칙을 설정합니다.">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowBulkSyncModal(true)} disabled={isBulkSyncing}>
            <RefreshCw className={`h-4 w-4 ${isBulkSyncing ? 'animate-spin' : ''}`} />
            {isBulkSyncing ? '동기화 중...' : '전체 직원 동기화'}
          </Button>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" />
            규칙 추가
          </Button>
        </div>
      </PageHeader>

      <Tabs
        tabs={[
          { key: 'ALLOWANCE', label: '수당', count: rules.filter((r) => r.type === 'ALLOWANCE').length },
          { key: 'DEDUCTION', label: '공제', count: rules.filter((r) => r.type === 'DEDUCTION').length },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
        className="mb-4"
      />

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <Spinner text="로딩중..." className="py-12" />
          ) : filteredRules.length === 0 ? (
            <EmptyState
              title={`등록된 ${activeTab === 'ALLOWANCE' ? '수당' : '공제'} 규칙이 없습니다`}
              action={
                <Button size="sm" onClick={openCreate}>
                  규칙 추가
                </Button>
              }
            />
          ) : (
            <Table
              columns={columns}
              data={filteredRules as unknown as RuleRow[]}
              onRowClick={(row) => openEdit(row as unknown as SalaryRule)}
            />
          )}
        </CardBody>
      </Card>

      {/* SlidePanel for Add/Edit/View */}
      <SlidePanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title={
          editing?.isSystemManaged
            ? '급여 규칙 상세'
            : editing
              ? '급여 규칙 수정'
              : '급여 규칙 추가'
        }
        size="lg"
      >
        <div className="space-y-4">
          {editing?.isSystemManaged && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Lock className="h-4 w-4 shrink-0" />
              법정 공제 항목은 자동으로 계산되며 직접 수정할 수 없습니다.
            </div>
          )}
          <Input
            label="코드"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            placeholder="예: A01"
            disabled={!!editing}
          />
          <Input
            label="항목명"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="예: 직책수당"
            disabled={!!editing?.isSystemManaged}
          />
          <Select
            label="구분"
            options={PAYMENT_TYPE_OPTIONS}
            value={formPaymentType}
            onChange={setFormPaymentType}
            disabled={!!editing?.isSystemManaged}
          />
          <Select
            label="지급 주기"
            options={PAYMENT_CYCLE_OPTIONS}
            value={formPaymentCycle}
            onChange={setFormPaymentCycle}
            disabled={!!editing?.isSystemManaged}
          />
          <Input
            label="기본 금액"
            type="number"
            value={String(formDefaultAmount)}
            onChange={(e) => setFormDefaultAmount(Number(e.target.value))}
            disabled={!!editing?.isSystemManaged}
          />
          {formPaymentType === 'FORMULA' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                계산식
              </label>
              {editing?.isSystemManaged ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  <FormulaDisplay formula={formFormula} />
                </div>
              ) : (
                <FormulaEditor
                  value={formFormula}
                  onChange={setFormFormula}
                  type={activeTab as 'ALLOWANCE' | 'DEDUCTION'}
                />
              )}
            </div>
          )}
          <Checkbox
            label="통상임금 포함"
            checked={formOrdinaryWage}
            onChange={setFormOrdinaryWage}
            disabled={!!editing?.isSystemManaged}
          />
          <Checkbox
            label="비과세 여부"
            checked={formTaxExempt}
            onChange={setFormTaxExempt}
            disabled={!!editing?.isSystemManaged}
          />
          {formTaxExempt && (
            <Select
              label="비과세 코드"
              options={TAX_EXEMPT_OPTIONS}
              value={formTaxExemptCode}
              onChange={setFormTaxExemptCode}
              disabled={!!editing?.isSystemManaged}
            />
          )}
          <Input
            label="정렬 순서"
            type="number"
            value={String(formSortOrder)}
            onChange={(e) => setFormSortOrder(Number(e.target.value))}
            disabled={!!editing?.isSystemManaged}
          />

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button variant="ghost" onClick={() => setShowPanel(false)}>
              {editing?.isSystemManaged ? '닫기' : '취소'}
            </Button>
            {!editing?.isSystemManaged && (
              <Button onClick={handleSave} disabled={saving || !formCode || !formName}>
                {saving ? <Spinner size="sm" /> : '저장'}
              </Button>
            )}
          </div>
        </div>
      </SlidePanel>

      {/* 전체 직원 동기화 확인 모달 */}
      <Modal
        open={showBulkSyncModal}
        onClose={() => setShowBulkSyncModal(false)}
        title="전체 직원 동기화"
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>현재 급여규칙을 모든 재직 직원에게 일괄 동기화합니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>각 직원의 항목명, 과세 설정 등이 급여규칙에 맞게 업데이트됩니다</li>
            <li>누락된 항목은 자동으로 추가됩니다</li>
            <li>금액은 변경되지 않습니다</li>
          </ul>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowBulkSyncModal(false)}>취소</Button>
          <Button onClick={handleBulkSync} disabled={isBulkSyncing}>
            {isBulkSyncing ? '동기화 중...' : '동기화'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
