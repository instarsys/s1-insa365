'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Plus, Pencil, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Tabs, Card, CardBody, Badge, Button, Input, Select, Modal, Table, Spinner, useToast } from '@/components/ui';
import { formatKRW } from '@/lib/utils';
import { fetcher, apiPost, apiPut } from '@/lib/api';
import type { Column } from '@/components/ui';

/* ─── Types ─── */

interface InsuranceRate {
  id: string;
  type: string;
  employeeRate: number;
  employerRate: number;
  minBase: number | null;
  maxBase: number | null;
  effectiveStartDate: string;
  effectiveEndDate: string;
  [key: string]: unknown;
}

interface TaxBracket {
  id: string;
  year: number;
  minIncome: number;
  maxIncome: number;
  dependents: number;
  taxAmount: number;
  [key: string]: unknown;
}

interface TaxExemptLimit {
  id: string;
  year: number;
  code: string;
  name: string;
  monthlyLimit: number;
  [key: string]: unknown;
}

interface MinimumWage {
  id: string;
  year: number;
  hourlyWage: number;
  monthlyWage: number;
  description?: string;
  [key: string]: unknown;
}

interface LegalParam {
  id: string;
  category: string;
  key: string;
  value: string;
  description?: string;
  unit?: string;
  [key: string]: unknown;
}

/* ─── Tab: Insurance Rates ─── */

function InsuranceRateTab() {
  const toast = useToast();
  const { data, isLoading, mutate } = useSWR<{ items: InsuranceRate[] }>('/api/system/insurance-rates', fetcher);
  const rates = data?.items ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<InsuranceRate | null>(null);
  const [form, setForm] = useState({ type: '', employeeRate: '', employerRate: '', minBase: '', maxBase: '', effectiveStartDate: '', effectiveEndDate: '' });
  const [saving, setSaving] = useState(false);

  const openCreate = useCallback(() => {
    setEditItem(null);
    setForm({ type: '', employeeRate: '', employerRate: '', minBase: '', maxBase: '', effectiveStartDate: '', effectiveEndDate: '' });
    setShowModal(true);
  }, []);

  const openEdit = useCallback((r: InsuranceRate) => {
    setEditItem(r);
    setForm({
      type: r.type,
      employeeRate: String(r.employeeRate),
      employerRate: String(r.employerRate),
      minBase: r.minBase ? String(r.minBase) : '',
      maxBase: r.maxBase ? String(r.maxBase) : '',
      effectiveStartDate: r.effectiveStartDate?.split('T')[0] ?? '',
      effectiveEndDate: r.effectiveEndDate?.split('T')[0] ?? '',
    });
    setShowModal(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        employeeRate: Number(form.employeeRate),
        employerRate: Number(form.employerRate),
        minBase: form.minBase ? Number(form.minBase) : null,
        maxBase: form.maxBase ? Number(form.maxBase) : null,
        effectiveStartDate: form.effectiveStartDate,
        effectiveEndDate: form.effectiveEndDate,
      };
      if (editItem) {
        await apiPut(`/api/system/insurance-rates/${editItem.id}`, payload);
        toast.success('보험요율이 수정되었습니다.');
      } else {
        await apiPost('/api/system/insurance-rates', payload);
        toast.success('보험요율이 추가되었습니다.');
      }
      await mutate();
      setShowModal(false);
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = { NATIONAL_PENSION: '국민연금', HEALTH_INSURANCE: '건강보험', LONG_TERM_CARE: '장기요양', EMPLOYMENT_INSURANCE: '고용보험' };
    return map[t] ?? t;
  };

  // Determine which rates are currently in effect
  const now = new Date().toISOString().split('T')[0];
  const isCurrentlyUsed = (r: InsuranceRate) => r.effectiveStartDate?.split('T')[0] <= now && r.effectiveEndDate?.split('T')[0] >= now;

  const columns: Column<InsuranceRate>[] = [
    { key: 'type', label: '유형', render: (r) => typeLabel(r.type) },
    { key: 'employeeRate', label: '근로자요율(%)', render: (r) => `${Number(r.employeeRate) * 100}%` },
    { key: 'employerRate', label: '사업자요율(%)', render: (r) => `${Number(r.employerRate) * 100}%` },
    { key: 'minBase', label: '하한', render: (r) => r.minBase ? formatKRW(Number(r.minBase)) : '-' },
    { key: 'maxBase', label: '상한', render: (r) => r.maxBase ? formatKRW(Number(r.maxBase)) : '-' },
    { key: 'effectiveStartDate', label: '적용시작', render: (r) => r.effectiveStartDate?.split('T')[0] },
    { key: 'effectiveEndDate', label: '적용종료', render: (r) => r.effectiveEndDate?.split('T')[0] },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          {isCurrentlyUsed(r) ? (
            <Badge variant="success">적용중</Badge>
          ) : (
            <button onClick={() => openEdit(r)} className="text-gray-400 hover:text-indigo-600">
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <Spinner text="보험요율 로딩중..." className="py-12" />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> 추가
        </Button>
      </div>
      <Table columns={columns} data={rates} />
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? '보험요율 수정' : '보험요율 추가'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select label="유형" options={[
            { value: 'NATIONAL_PENSION', label: '국민연금' },
            { value: 'HEALTH_INSURANCE', label: '건강보험' },
            { value: 'LONG_TERM_CARE', label: '장기요양' },
            { value: 'EMPLOYMENT_INSURANCE', label: '고용보험' },
          ]} value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} />
          <Input label="근로자요율" type="number" value={form.employeeRate} onChange={(e) => setForm((f) => ({ ...f, employeeRate: e.target.value }))} />
          <Input label="사업자요율" type="number" value={form.employerRate} onChange={(e) => setForm((f) => ({ ...f, employerRate: e.target.value }))} />
          <Input label="하한" type="number" value={form.minBase} onChange={(e) => setForm((f) => ({ ...f, minBase: e.target.value }))} />
          <Input label="상한" type="number" value={form.maxBase} onChange={(e) => setForm((f) => ({ ...f, maxBase: e.target.value }))} />
          <Input label="적용시작일" type="date" value={form.effectiveStartDate} onChange={(e) => setForm((f) => ({ ...f, effectiveStartDate: e.target.value }))} />
          <Input label="적용종료일" type="date" value={form.effectiveEndDate} onChange={(e) => setForm((f) => ({ ...f, effectiveEndDate: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

/* ─── Tab: Tax Brackets ─── */

function TaxBracketTab() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const { data, isLoading } = useSWR<{ items: TaxBracket[] }>(`/api/system/tax-brackets?year=${year}`, fetcher);
  const brackets = data?.items ?? [];

  const filtered = brackets;
  const currentYear = new Date().getFullYear();
  const uniqueYears = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const columns: Column<TaxBracket>[] = [
    { key: 'minIncome', label: '최소소득', render: (r) => formatKRW(Number(r.minIncome)) },
    { key: 'maxIncome', label: '최대소득', render: (r) => formatKRW(Number(r.maxIncome)) },
    { key: 'dependents', label: '부양가족' },
    { key: 'taxAmount', label: '세액', render: (r) => formatKRW(Number(r.taxAmount)) },
  ];

  if (isLoading) return <Spinner text="세액표 로딩중..." className="py-12" />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            options={uniqueYears.map((y) => ({ value: String(y), label: `${y}년` }))}
            value={year}
            onChange={setYear}
          />
          <span className="text-sm text-gray-500">간이세액표 ({filtered.length}건)</span>
        </div>
        <Button size="sm" variant="secondary">
          <Upload className="h-4 w-4" /> 엑셀 업로드
        </Button>
      </div>
      <Table columns={columns} data={filtered} />
    </div>
  );
}

/* ─── Tab: Tax Exempt Limits ─── */

function TaxExemptTab() {
  const toast = useToast();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const { data, isLoading, mutate } = useSWR<{ items: TaxExemptLimit[] }>(`/api/system/tax-exempt-limits?year=${year}`, fetcher);
  const exempts = data?.items ?? [];
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<TaxExemptLimit | null>(null);
  const [form, setForm] = useState({ code: '', name: '', monthlyLimit: '' });
  const [saving, setSaving] = useState(false);

  const filtered = exempts;
  const currentYear = new Date().getFullYear();
  const uniqueYears = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const openEdit = (r: TaxExemptLimit) => {
    setEditItem(r);
    setForm({ code: r.code, name: r.name, monthlyLimit: String(r.monthlyLimit) });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ code: '', name: '', monthlyLimit: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { year: Number(year), code: form.code, name: form.name, monthlyLimit: Number(form.monthlyLimit) };
      if (editItem) {
        await apiPut(`/api/system/tax-exempt-limits/${editItem.id}`, payload);
        toast.success('비과세한도가 수정되었습니다.');
      } else {
        await apiPost('/api/system/tax-exempt-limits', payload);
        toast.success('비과세한도가 추가되었습니다.');
      }
      await mutate();
      setShowModal(false);
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<TaxExemptLimit>[] = [
    { key: 'code', label: '코드' },
    { key: 'name', label: '항목명' },
    { key: 'monthlyLimit', label: '월한도액', render: (r) => formatKRW(Number(r.monthlyLimit)) },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button onClick={() => openEdit(r)} className="text-gray-400 hover:text-indigo-600">
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ];

  if (isLoading) return <Spinner text="비과세한도 로딩중..." className="py-12" />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Select
          options={uniqueYears.length > 0 ? uniqueYears.map((y) => ({ value: String(y), label: `${y}년` })) : [{ value: '2025', label: '2025년' }]}
          value={year}
          onChange={setYear}
        />
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> 추가
        </Button>
      </div>
      <Table columns={columns} data={filtered} />
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? '비과세한도 수정' : '비과세한도 추가'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="코드" placeholder="MEALS" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Input label="항목명" placeholder="식대" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="월한도액" type="number" placeholder="200000" value={form.monthlyLimit} onChange={(e) => setForm((f) => ({ ...f, monthlyLimit: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

/* ─── Tab: Minimum Wage ─── */

function MinimumWageTab() {
  const toast = useToast();
  const { data, isLoading, mutate } = useSWR<{ items: MinimumWage[] }>('/api/system/minimum-wages', fetcher);
  const wages = data?.items ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MinimumWage | null>(null);
  const [form, setForm] = useState({ year: '', hourlyWage: '', monthlyWage: '', description: '' });
  const [saving, setSaving] = useState(false);

  const openEdit = (r: MinimumWage) => {
    setEditItem(r);
    setForm({ year: String(r.year), hourlyWage: String(r.hourlyWage), monthlyWage: String(r.monthlyWage), description: r.description ?? '' });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ year: '', hourlyWage: '', monthlyWage: '', description: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { year: Number(form.year), hourlyWage: Number(form.hourlyWage), monthlyWage: Number(form.monthlyWage), description: form.description || undefined };
      if (editItem) {
        await apiPut(`/api/system/minimum-wages/${editItem.id}`, payload);
        toast.success('최저임금이 수정되었습니다.');
      } else {
        await apiPost('/api/system/minimum-wages', payload);
        toast.success('최저임금이 추가되었습니다.');
      }
      await mutate();
      setShowModal(false);
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<MinimumWage>[] = [
    { key: 'year', label: '연도' },
    { key: 'hourlyWage', label: '시급', render: (r) => formatKRW(Number(r.hourlyWage)) },
    { key: 'monthlyWage', label: '월급(209h)', render: (r) => formatKRW(Number(r.monthlyWage)) },
    { key: 'description', label: '설명', render: (r) => r.description ?? '-' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button onClick={() => openEdit(r)} className="text-gray-400 hover:text-indigo-600">
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ];

  if (isLoading) return <Spinner text="최저임금 로딩중..." className="py-12" />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> 추가
        </Button>
      </div>
      <Table columns={columns} data={wages} />
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? '최저임금 수정' : '최저임금 추가'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="연도" type="number" placeholder="2026" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
          <Input label="시급" type="number" placeholder="10320" value={form.hourlyWage} onChange={(e) => setForm((f) => ({ ...f, hourlyWage: e.target.value }))} />
          <Input label="월급(209h)" type="number" placeholder="2156880" value={form.monthlyWage} onChange={(e) => setForm((f) => ({ ...f, monthlyWage: e.target.value }))} />
          <Input label="설명" placeholder="2026년 최저임금" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

/* ─── Tab: Legal Constants ─── */

function LegalConstantsTab() {
  const toast = useToast();
  const { data, isLoading, mutate } = useSWR<{ items: LegalParam[] }>('/api/system/legal-params', fetcher);
  const params = data?.items ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<LegalParam | null>(null);
  const [form, setForm] = useState({ value: '', description: '', unit: '' });
  const [saving, setSaving] = useState(false);

  const openEdit = (r: LegalParam) => {
    setEditItem(r);
    setForm({ value: r.value, description: r.description ?? '', unit: r.unit ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await apiPut(`/api/system/legal-params/${editItem.id}`, { value: form.value, description: form.description || undefined, unit: form.unit || undefined });
      toast.success('법정상수가 수정되었습니다.');
      await mutate();
      setShowModal(false);
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<LegalParam>[] = [
    { key: 'category', label: '카테고리', render: (r) => <Badge variant="gray">{r.category}</Badge> },
    { key: 'key', label: '키', render: (r) => <code className="text-xs">{r.key}</code> },
    { key: 'value', label: '값', render: (r) => <span className="font-medium">{r.value}</span> },
    { key: 'description', label: '설명', render: (r) => r.description ?? '-' },
    { key: 'unit', label: '단위', render: (r) => r.unit ?? '-' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button
          onClick={() => openEdit(r)}
          className="text-gray-400 hover:text-indigo-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ];

  if (isLoading) return <Spinner text="법정상수 로딩중..." className="py-12" />;

  return (
    <div>
      <Table columns={columns} data={params} />
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="법정상수 수정"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="카테고리" defaultValue={editItem?.category ?? ''} disabled />
          <Input label="키" defaultValue={editItem?.key ?? ''} disabled />
          <Input label="값" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
          <Input label="설명" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Input label="단위" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

/* ─── Main Page ─── */

const tabList = [
  { key: 'insurance', label: '보험요율' },
  { key: 'tax', label: '간이세액표' },
  { key: 'exempt', label: '비과세한도' },
  { key: 'wage', label: '최저임금' },
  { key: 'constants', label: '법정상수' },
];

export default function LegalParamsPage() {
  const [activeTab, setActiveTab] = useState('insurance');

  return (
    <div>
      <PageHeader title="법정 파라미터" subtitle="보험요율, 세율, 최저임금 등 법정 파라미터를 관리합니다." />
      <Card>
        <div className="px-2">
          <Tabs tabs={tabList} activeKey={activeTab} onChange={setActiveTab} />
        </div>
        <CardBody>
          {activeTab === 'insurance' && <InsuranceRateTab />}
          {activeTab === 'tax' && <TaxBracketTab />}
          {activeTab === 'exempt' && <TaxExemptTab />}
          {activeTab === 'wage' && <MinimumWageTab />}
          {activeTab === 'constants' && <LegalConstantsTab />}
        </CardBody>
      </Card>
    </div>
  );
}
