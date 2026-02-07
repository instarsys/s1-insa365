'use client';

import { useState } from 'react';
import { Plus, Pencil, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Tabs, Card, CardBody, Badge, Button, Input, Select, Modal, Table } from '@/components/ui';
import { formatKRW } from '@/lib/utils';
import type { Column } from '@/components/ui';

/* ─── Types ─── */

interface InsuranceRate {
  id: string;
  type: string;
  employeeRate: number;
  employerRate: number;
  minBase: number;
  maxBase: number;
  effectiveStartDate: string;
  effectiveEndDate: string;
  isUsed: boolean;
  [key: string]: unknown;
}

interface TaxBracket {
  id: string;
  year: number;
  minIncome: number;
  maxIncome: number;
  baseAmount: number;
  rate: number;
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
  description: string;
  [key: string]: unknown;
}

interface LegalParam {
  id: string;
  category: string;
  key: string;
  value: string;
  description: string;
  unit: string;
  [key: string]: unknown;
}

/* ─── Mock data ─── */

const MOCK_RATES: InsuranceRate[] = [
  { id: '1', type: '국민연금', employeeRate: 4.5, employerRate: 4.5, minBase: 390000, maxBase: 6170000, effectiveStartDate: '2025-01-01', effectiveEndDate: '2025-06-30', isUsed: true },
  { id: '2', type: '국민연금', employeeRate: 4.5, employerRate: 4.5, minBase: 400000, maxBase: 6370000, effectiveStartDate: '2025-07-01', effectiveEndDate: '2025-12-31', isUsed: false },
  { id: '3', type: '건강보험', employeeRate: 3.545, employerRate: 3.545, minBase: 279000, maxBase: 12706000, effectiveStartDate: '2025-01-01', effectiveEndDate: '2025-12-31', isUsed: true },
  { id: '4', type: '장기요양', employeeRate: 12.95, employerRate: 12.95, minBase: 0, maxBase: 0, effectiveStartDate: '2025-01-01', effectiveEndDate: '2025-12-31', isUsed: true },
  { id: '5', type: '고용보험', employeeRate: 0.9, employerRate: 1.15, minBase: 0, maxBase: 0, effectiveStartDate: '2025-01-01', effectiveEndDate: '2025-12-31', isUsed: true },
];

const MOCK_TAX_BRACKETS: TaxBracket[] = [
  { id: '1', year: 2025, minIncome: 0, maxIncome: 14000000, baseAmount: 0, rate: 6 },
  { id: '2', year: 2025, minIncome: 14000000, maxIncome: 50000000, baseAmount: 840000, rate: 15 },
  { id: '3', year: 2025, minIncome: 50000000, maxIncome: 88000000, baseAmount: 6240000, rate: 24 },
];

const MOCK_EXEMPTS: TaxExemptLimit[] = [
  { id: '1', year: 2025, code: 'H01', name: '식대', monthlyLimit: 200000 },
  { id: '2', year: 2025, code: 'H02', name: '자가운전보조금', monthlyLimit: 200000 },
  { id: '3', year: 2025, code: 'H03', name: '육아수당', monthlyLimit: 200000 },
];

const MOCK_WAGES: MinimumWage[] = [
  { id: '1', year: 2025, hourlyWage: 10030, monthlyWage: 2096270, description: '2025년 최저임금' },
  { id: '2', year: 2026, hourlyWage: 10320, monthlyWage: 2156880, description: '2026년 최저임금' },
];

const MOCK_PARAMS: LegalParam[] = [
  { id: '1', category: '근로시간', key: 'STANDARD_MONTHLY_HOURS', value: '209', description: '월 소정근로시간', unit: '시간' },
  { id: '2', category: '근로시간', key: 'WEEKLY_WORK_LIMIT', value: '52', description: '주 최대 근로시간', unit: '시간' },
  { id: '3', category: '수당률', key: 'OVERTIME_RATE', value: '1.5', description: '연장근로 수당 배율', unit: '배' },
  { id: '4', category: '수당률', key: 'NIGHT_RATE', value: '0.5', description: '야간근로 가산 배율', unit: '배' },
  { id: '5', category: '수당률', key: 'HOLIDAY_WITHIN_8H_RATE', value: '1.5', description: '휴일근로(8h이내) 배율', unit: '배' },
  { id: '6', category: '수당률', key: 'HOLIDAY_OVER_8H_RATE', value: '2.0', description: '휴일근로(8h초과) 배율', unit: '배' },
];

/* ─── Tab: Insurance Rates ─── */

function InsuranceRateTab() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<InsuranceRate | null>(null);

  const columns: Column<InsuranceRate>[] = [
    { key: 'type', label: '유형' },
    { key: 'employeeRate', label: '근로자요율(%)', render: (r) => `${r.employeeRate}%` },
    { key: 'employerRate', label: '사업자요율(%)', render: (r) => `${r.employerRate}%` },
    { key: 'minBase', label: '하한', render: (r) => r.minBase > 0 ? formatKRW(r.minBase) : '-' },
    { key: 'maxBase', label: '상한', render: (r) => r.maxBase > 0 ? formatKRW(r.maxBase) : '-' },
    { key: 'effectiveStartDate', label: '적용시작' },
    { key: 'effectiveEndDate', label: '적용종료' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.isUsed ? (
            <Badge variant="success">사용됨</Badge>
          ) : (
            <button onClick={() => { setEditItem(r); setShowModal(true); }} className="text-gray-400 hover:text-purple-600">
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setEditItem(null); setShowModal(true); }}>
          <Plus className="h-4 w-4" /> 추가
        </Button>
      </div>
      <Table columns={columns} data={MOCK_RATES} />
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? '보험요율 수정' : '보험요율 추가'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={() => setShowModal(false)}>저장</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select label="유형" options={[
            { value: '국민연금', label: '국민연금' },
            { value: '건강보험', label: '건강보험' },
            { value: '장기요양', label: '장기요양' },
            { value: '고용보험', label: '고용보험' },
          ]} value={editItem?.type ?? ''} />
          <Input label="근로자요율(%)" type="number" defaultValue={editItem?.employeeRate ?? ''} />
          <Input label="사업자요율(%)" type="number" defaultValue={editItem?.employerRate ?? ''} />
          <Input label="하한" type="number" defaultValue={editItem?.minBase ?? ''} />
          <Input label="상한" type="number" defaultValue={editItem?.maxBase ?? ''} />
          <Input label="적용시작일" type="date" defaultValue={editItem?.effectiveStartDate ?? ''} />
          <Input label="적용종료일" type="date" defaultValue={editItem?.effectiveEndDate ?? ''} />
        </div>
      </Modal>
    </div>
  );
}

/* ─── Tab: Tax Brackets ─── */

function TaxBracketTab() {
  const [year, setYear] = useState('2025');

  const columns: Column<TaxBracket>[] = [
    { key: 'minIncome', label: '최소소득', render: (r) => formatKRW(r.minIncome) },
    { key: 'maxIncome', label: '최대소득', render: (r) => formatKRW(r.maxIncome) },
    { key: 'baseAmount', label: '기본세액', render: (r) => formatKRW(r.baseAmount) },
    { key: 'rate', label: '세율(%)', render: (r) => `${r.rate}%` },
  ];

  const filtered = MOCK_TAX_BRACKETS.filter((b) => b.year === Number(year));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            options={[
              { value: '2025', label: '2025년' },
              { value: '2024', label: '2024년' },
            ]}
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
  const [year, setYear] = useState('2025');
  const [showModal, setShowModal] = useState(false);

  const columns: Column<TaxExemptLimit>[] = [
    { key: 'code', label: '코드' },
    { key: 'name', label: '항목명' },
    { key: 'monthlyLimit', label: '월한도액', render: (r) => formatKRW(r.monthlyLimit) },
    {
      key: 'actions',
      label: '',
      render: () => (
        <button onClick={() => setShowModal(true)} className="text-gray-400 hover:text-purple-600">
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const filtered = MOCK_EXEMPTS.filter((e) => e.year === Number(year));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Select
          options={[
            { value: '2025', label: '2025년' },
            { value: '2024', label: '2024년' },
          ]}
          value={year}
          onChange={setYear}
        />
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> 추가
        </Button>
      </div>
      <Table columns={columns} data={filtered} />
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="비과세한도 수정"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={() => setShowModal(false)}>저장</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="코드" placeholder="H01" />
          <Input label="항목명" placeholder="식대" />
          <Input label="월한도액" type="number" placeholder="200000" />
        </div>
      </Modal>
    </div>
  );
}

/* ─── Tab: Minimum Wage ─── */

function MinimumWageTab() {
  const [showModal, setShowModal] = useState(false);

  const columns: Column<MinimumWage>[] = [
    { key: 'year', label: '연도' },
    { key: 'hourlyWage', label: '시급', render: (r) => formatKRW(r.hourlyWage) },
    { key: 'monthlyWage', label: '월급(209h)', render: (r) => formatKRW(r.monthlyWage) },
    { key: 'description', label: '설명' },
    {
      key: 'actions',
      label: '',
      render: () => (
        <button onClick={() => setShowModal(true)} className="text-gray-400 hover:text-purple-600">
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> 추가
        </Button>
      </div>
      <Table columns={columns} data={MOCK_WAGES} />
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="최저임금 수정"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={() => setShowModal(false)}>저장</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="연도" type="number" placeholder="2026" />
          <Input label="시급" type="number" placeholder="10320" />
          <Input label="월급(209h)" type="number" placeholder="2156880" />
          <Input label="설명" placeholder="2026년 최저임금" />
        </div>
      </Modal>
    </div>
  );
}

/* ─── Tab: Legal Constants ─── */

function LegalConstantsTab() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<LegalParam | null>(null);

  const columns: Column<LegalParam>[] = [
    { key: 'category', label: '카테고리', render: (r) => <Badge variant="gray">{r.category}</Badge> },
    { key: 'key', label: '키', render: (r) => <code className="text-xs">{r.key}</code> },
    { key: 'value', label: '값', render: (r) => <span className="font-medium">{r.value}</span> },
    { key: 'description', label: '설명' },
    { key: 'unit', label: '단위' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button
          onClick={() => { setEditItem(r); setShowModal(true); }}
          className="text-gray-400 hover:text-purple-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <Table columns={columns} data={MOCK_PARAMS} />
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="법정상수 수정"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={() => setShowModal(false)}>저장</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="카테고리" defaultValue={editItem?.category ?? ''} disabled />
          <Input label="키" defaultValue={editItem?.key ?? ''} disabled />
          <Input label="값" defaultValue={editItem?.value ?? ''} />
          <Input label="설명" defaultValue={editItem?.description ?? ''} />
          <Input label="단위" defaultValue={editItem?.unit ?? ''} />
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
