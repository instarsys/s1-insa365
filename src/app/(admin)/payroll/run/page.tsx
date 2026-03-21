'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Calculator,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Users,
  CalendarDays,
  Banknote,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Stepper } from '@/components/ui/Stepper';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { Table } from '@/components/ui/Table';
import { useToast } from '@/components/ui';
import { usePayrollSpreadsheet, usePayrollSummary, usePayrollMutations, usePayrollAttendanceReview, usePayrollDetail } from '@/hooks';
import { formatKRW } from '@/lib/utils';
import Link from 'next/link';

const STEPS = [
  { label: '급여 입력', description: 'Step 1' },
  { label: '검토', description: 'Step 2' },
  { label: '확정', description: 'Step 3' },
];

const currentDate = new Date();

function generateYearOptions() {
  const year = currentDate.getFullYear();
  return [year - 1, year, year + 1].map((y) => ({ value: String(y), label: `${y}년` }));
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));

interface PayrollDetailData {
  employeeName: string;
  employeeNumber: string | null;
  departmentName: string | null;
  salaryType: string;
  ordinaryWageMonthly: number;
  ordinaryWageHourly: number;
  attendance: {
    workDays: number;
    actualWorkDays: number;
    absentDays: number;
    lateDays: number;
    earlyLeaveDays: number;
    leaveDays: number;
    overtimeMinutes: number;
    nightMinutes: number;
    holidayMinutes: number;
  } | null;
  payItems: { label: string; amount: number; description: string }[];
  totalPay: number;
  totalNonTaxable: number;
  taxableIncome: number;
  deductionItems: { label: string; amount: number; description: string }[];
  totalDeduction: number;
  netPay: number;
  prorationApplied: boolean;
  prorationRatio: number | null;
  minimumWageWarning: boolean;
}

function PayrollDetailPanel({ detail, isLoading }: { detail: PayrollDetailData | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" text="세부 내역 로딩중..." />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="px-6 py-4 text-sm text-gray-500">세부 내역을 불러올 수 없습니다.</div>
    );
  }

  const minutesToH = (min: number) => Math.round((min / 60) * 10) / 10;

  return (
    <div className="border-t border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white px-6 py-5">
      {/* 통상임금 헤더 */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="font-medium text-gray-700">통상임금</span>
        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
          월 {formatKRW(detail.ordinaryWageMonthly)}
        </span>
        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
          시급 {formatKRW(detail.ordinaryWageHourly)}
        </span>
        {detail.minimumWageWarning && (
          <Badge variant="warning">최저임금 미달</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 근태 현황 */}
        {detail.attendance && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">근태 현황</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>근무일</span>
                <span className="font-medium text-gray-800">{detail.attendance.workDays}일</span>
              </div>
              <div className="flex justify-between">
                <span>실근무</span>
                <span className="font-medium text-gray-800">{detail.attendance.actualWorkDays}일</span>
              </div>
              {detail.attendance.absentDays > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>결근</span>
                  <span className="font-medium">{detail.attendance.absentDays}일</span>
                </div>
              )}
              {detail.attendance.lateDays > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>지각</span>
                  <span className="font-medium">{detail.attendance.lateDays}일</span>
                </div>
              )}
              {detail.attendance.earlyLeaveDays > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>조퇴</span>
                  <span className="font-medium">{detail.attendance.earlyLeaveDays}일</span>
                </div>
              )}
              {detail.attendance.leaveDays > 0 && (
                <div className="flex justify-between">
                  <span>휴가</span>
                  <span className="font-medium text-gray-800">{detail.attendance.leaveDays}일</span>
                </div>
              )}
              {detail.attendance.overtimeMinutes > 0 && (
                <div className="flex justify-between">
                  <span>연장</span>
                  <span className="font-medium text-gray-800">{minutesToH(detail.attendance.overtimeMinutes)}h</span>
                </div>
              )}
              {detail.attendance.nightMinutes > 0 && (
                <div className="flex justify-between">
                  <span>야간</span>
                  <span className="font-medium text-gray-800">{minutesToH(detail.attendance.nightMinutes)}h</span>
                </div>
              )}
              {detail.attendance.holidayMinutes > 0 && (
                <div className="flex justify-between">
                  <span>휴일</span>
                  <span className="font-medium text-gray-800">{minutesToH(detail.attendance.holidayMinutes)}h</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 지급 항목 */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-500">지급 항목</h4>
          <div className="space-y-1.5">
            {detail.payItems.map((item, i) => (
              <div key={i} className="flex items-baseline justify-between text-xs">
                <div>
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="ml-2 text-gray-400">{item.description}</span>
                </div>
                <span className={`ml-4 whitespace-nowrap font-medium tabular-nums ${item.amount < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {formatKRW(item.amount)}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-blue-200 pt-1.5 text-xs font-semibold text-blue-700">
              <span>총지급</span>
              <span className="tabular-nums">{formatKRW(detail.totalPay)}</span>
            </div>
          </div>

          {/* 비과세 */}
          <div className="mt-3 rounded bg-gray-100 px-2 py-1.5 text-xs text-gray-600">
            비과세 {formatKRW(detail.totalNonTaxable)} → 과세소득 {formatKRW(detail.taxableIncome)}
          </div>
        </div>

        {/* 공제 항목 */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-500">공제 항목</h4>
          <div className="space-y-1.5">
            {detail.deductionItems.map((item, i) => (
              <div key={i} className="flex items-baseline justify-between text-xs">
                <div>
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="ml-2 text-gray-400">{item.description}</span>
                </div>
                <span className="ml-4 whitespace-nowrap font-medium tabular-nums text-red-600">
                  {formatKRW(item.amount)}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-red-200 pt-1.5 text-xs font-semibold text-red-700">
              <span>총공제</span>
              <span className="tabular-nums">{formatKRW(detail.totalDeduction)}</span>
            </div>
          </div>

          {/* 실수령 */}
          <div className="mt-3 rounded bg-emerald-50 px-3 py-2 text-center">
            <span className="text-xs text-emerald-600">실수령</span>
            <span className="ml-2 text-sm font-bold tabular-nums text-emerald-700">{formatKRW(detail.netPay)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollRunPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [calculating, setCalculating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const toast = useToast();
  const [expandedCalcId, setExpandedCalcId] = useState<string | null>(null);

  const { rows, isLoading: spreadsheetLoading, mutate: mutateSpreadsheet } = usePayrollSpreadsheet(year, month);
  const { summary, isLoading: summaryLoading } = usePayrollSummary(year, month);
  const { review, isLoading: reviewLoading } = usePayrollAttendanceReview(year, month);
  const { detail, isLoading: detailLoading } = usePayrollDetail(expandedCalcId);
  const mutations = usePayrollMutations();

  // Inline editing state: { [employeeId-code]: editValue }
  const [editingCells, setEditingCells] = useState<Record<string, string>>({});

  const startEdit = useCallback((employeeId: string, code: string, currentValue: number) => {
    setEditingCells((prev) => ({ ...prev, [`${employeeId}-${code}`]: String(currentValue) }));
  }, []);

  const updateEditValue = useCallback((key: string, value: string) => {
    setEditingCells((prev) => ({ ...prev, [key]: value }));
  }, []);

  const commitEdit = useCallback(async (row: typeof rows[number], code: string) => {
    const key = `${row.employeeId}-${code}`;
    const newValue = Number(editingCells[key] ?? 0);
    setEditingCells((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    // Only update if row has a calculationId (from API)
    const calcId = (row as unknown as Record<string, unknown>).calculationId as string | undefined;
    if (calcId && row.status === 'DRAFT') {
      await mutations.updateItem(calcId, { variableAllowances: newValue });
      await mutateSpreadsheet();
    }
  }, [editingCells, mutations, mutateSpreadsheet]);

  const cancelEdit = useCallback((employeeId: string, code: string) => {
    setEditingCells((prev) => {
      const next = { ...prev };
      delete next[`${employeeId}-${code}`];
      return next;
    });
  }, []);

  const yearOptions = useMemo(() => generateYearOptions(), []);

  // Separate allowance and deduction columns from rows
  const allowanceColumns = useMemo(() => {
    const cols = new Map<string, string>();
    for (const row of rows) {
      for (const item of row.items) {
        if (item.type === 'ALLOWANCE' && !cols.has(item.code)) {
          cols.set(item.code, item.name);
        }
      }
    }
    return Array.from(cols.entries()).map(([code, name]) => ({ code, name }));
  }, [rows]);

  const deductionColumns = useMemo(() => {
    const cols = new Map<string, string>();
    for (const row of rows) {
      for (const item of row.items) {
        if (item.type === 'DEDUCTION' && !cols.has(item.code)) {
          cols.set(item.code, item.name);
        }
      }
    }
    return Array.from(cols.entries()).map(([code, name]) => ({ code, name }));
  }, [rows]);

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(rows.map((r) => r.employeeId)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function toggleSelect(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  }

  async function handleCalculate() {
    setCalculating(true);
    try {
      await mutations.calculate({ year, month });
      await mutateSpreadsheet();
    } catch (err) {
      const message = err instanceof Error ? err.message : '급여 계산 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setCalculating(false);
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      await mutations.confirm({ year, month });
      setShowConfirmModal(false);
      setConfirmed(true);
    } catch (err) {
      setShowConfirmModal(false);
      const message = err instanceof Error ? err.message : '급여 확정 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  }

  function getItemAmount(row: typeof rows[number], code: string): number {
    return row.items.find((i) => i.code === code)?.amount ?? 0;
  }

  return (
    <div>
      <PageHeader title="급여 실행" subtitle="3단계로 급여를 계산하고 확정합니다." />

      {/* Stepper */}
      <Stepper steps={STEPS} currentStep={currentStep} className="mb-8" />

      {/* Step 1: 급여 입력 */}
      {currentStep === 0 && (
        <div>
          {/* Controls */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex flex-wrap items-end gap-4">
                <Select
                  label="연도"
                  options={yearOptions}
                  value={String(year)}
                  onChange={(v) => setYear(Number(v))}
                  wrapperClassName="w-28"
                />
                <Select
                  label="월"
                  options={MONTH_OPTIONS}
                  value={String(month)}
                  onChange={(v) => setMonth(Number(v))}
                  wrapperClassName="w-24"
                />
                <Button onClick={handleCalculate} disabled={calculating}>
                  {calculating ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <Calculator className="h-4 w-4" />
                      계산하기
                    </>
                  )}
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* 근태 검토 패널 */}
          {!reviewLoading && review && (
            <Card className="mb-6">
              <CardBody>
                {review.unconfirmedEmployees.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700">
                      {review.confirmedCount}/{review.activeEmployeeCount}명 근태 확정 완료
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700">
                        {review.unconfirmedEmployees.length}명 미확정
                      </span>
                      <span className="text-xs text-amber-600">
                        ({review.confirmedCount}/{review.activeEmployeeCount}명 확정)
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {review.unconfirmedEmployees.map((emp) => (
                        <span
                          key={emp.id}
                          className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                        >
                          {emp.name}
                          {emp.departmentName && <span className="ml-1 text-amber-600">({emp.departmentName})</span>}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2">
                      <Link href="/attendance" className="text-xs font-medium text-amber-700 underline hover:text-amber-900">
                        근태 관리 바로가기
                      </Link>
                    </div>
                  </div>
                )}

                {/* 근태 요약 통계 */}
                <details className="mt-3">
                  <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700">
                    <ChevronDown className="h-3.5 w-3.5" />
                    근태 요약
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
                    <span>결근 <strong className="text-gray-800">{review.summary.totalAbsentDays}일</strong></span>
                    <span>지각 <strong className="text-gray-800">{review.summary.totalLateDays}일</strong></span>
                    <span>조퇴 <strong className="text-gray-800">{review.summary.totalEarlyLeaveDays}일</strong></span>
                    <span>휴가 <strong className="text-gray-800">{review.summary.totalLeaveDays}일</strong></span>
                    <span className="border-l border-gray-300 pl-4">연장 <strong className="text-gray-800">{review.summary.totalOvertimeHours}h</strong></span>
                    <span>야간 <strong className="text-gray-800">{review.summary.totalNightHours}h</strong></span>
                    <span>휴일 <strong className="text-gray-800">{review.summary.totalHolidayHours}h</strong></span>
                  </div>
                </details>
              </CardBody>
            </Card>
          )}

          {/* 미처리 휴가 경고 */}
          {!reviewLoading && review && review.pendingLeaveRequests && review.pendingLeaveRequests.length > 0 && (
            <Card className="mb-6">
              <CardBody>
                <div className="rounded-lg bg-amber-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700">
                      미처리 휴가 {review.pendingLeaveRequests.length}건
                    </span>
                    <span className="text-xs text-amber-600">
                      승인/거부 후 급여를 실행하세요
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {review.pendingLeaveRequests.map((leave) => (
                      <span
                        key={leave.id}
                        className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                      >
                        {leave.employeeName} — {leave.leaveType === 'ANNUAL' ? '연차' : leave.leaveType === 'HALF_DAY_AM' ? '오전반차' : leave.leaveType === 'HALF_DAY_PM' ? '오후반차' : leave.leaveType === 'SICK' ? '병가' : leave.leaveType === 'FAMILY_EVENT' ? '경조사' : leave.leaveType === 'UNPAID' ? '무급휴가' : '기타'} ({leave.startDate}~{leave.endDate})
                      </span>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Link href="/leave" className="text-xs font-medium text-amber-700 underline hover:text-amber-900">
                      휴가 관리 바로가기
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Spreadsheet Table */}
          <Card>
            <CardHeader>
              <CardTitle>{year}년 {month}월 급여 입력</CardTitle>
              <Badge variant="info">{rows.length}명</Badge>
            </CardHeader>
            <CardBody className="p-0">
              {spreadsheetLoading ? (
                <Spinner text="급여 데이터 로딩중..." className="py-12" />
              ) : rows.length === 0 ? (
                <EmptyState
                  title="급여 데이터가 없습니다"
                  description="계산하기 버튼을 눌러 급여를 생성하세요."
                  icon={<Calculator className="h-10 w-10" />}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="sticky left-0 z-10 bg-gray-50 px-3 py-3">
                          <Checkbox
                            checked={allSelected}
                            indeterminate={selectedIds.size > 0 && !allSelected}
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th className="sticky left-10 z-10 whitespace-nowrap bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          사번
                        </th>
                        <th className="sticky left-[7.5rem] z-10 whitespace-nowrap bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          이름
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          부서
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          기본급
                        </th>
                        {allowanceColumns.map((col) => (
                          <th
                            key={col.code}
                            className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-blue-600"
                          >
                            {col.name}
                          </th>
                        ))}
                        <th className="whitespace-nowrap bg-blue-50 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-blue-700">
                          총지급
                        </th>
                        {deductionColumns.map((col) => (
                          <th
                            key={col.code}
                            className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-red-600"
                          >
                            {col.name}
                          </th>
                        ))}
                        <th className="whitespace-nowrap bg-red-50 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-red-700">
                          총공제
                        </th>
                        <th className="whitespace-nowrap bg-emerald-50 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-emerald-700">
                          실수령
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          스킵
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row) => {
                        const rowCalcId = (row as unknown as Record<string, string>).calculationId;
                        const isExpanded = expandedCalcId === rowCalcId;
                        const totalColSpan = 5 + allowanceColumns.length + 1 + deductionColumns.length + 3;
                        return (
                        <React.Fragment key={row.employeeId}>
                        <tr
                          className={`hover:bg-indigo-50/30 ${row.isSkipped ? 'bg-gray-50 opacity-60' : ''} ${row.status === 'SKIPPED' && row.skipReason === '근태 미확정' ? 'bg-amber-50/50' : ''} ${isExpanded ? 'bg-indigo-50/40' : ''}`}
                        >
                          <td className="sticky left-0 z-10 bg-white px-3 py-3">
                            <Checkbox
                              checked={selectedIds.has(row.employeeId)}
                              onChange={(c) => toggleSelect(row.employeeId, c)}
                            />
                          </td>
                          <td className="sticky left-10 z-10 whitespace-nowrap bg-white px-4 py-3 text-xs text-gray-500">
                            {row.employeeNumber}
                          </td>
                          <td className="sticky left-[7.5rem] z-10 whitespace-nowrap bg-white px-4 py-3 text-sm font-medium text-gray-800">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className="cursor-pointer text-left text-indigo-600 hover:text-indigo-800 hover:underline"
                                onClick={() => setExpandedCalcId(
                                  expandedCalcId === (row as unknown as Record<string, string>).calculationId
                                    ? null
                                    : (row as unknown as Record<string, string>).calculationId ?? null
                                )}
                              >
                                {row.employeeName}
                              </button>
                              {row.status === 'SKIPPED' && row.skipReason === '근태 미확정' && (
                                <Badge variant="warning">근태 미확정</Badge>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                            {row.departmentName ?? '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums">
                            {formatKRW(row.basePay)}
                          </td>
                          {allowanceColumns.map((col) => {
                            const item = row.items.find((i) => i.code === col.code);
                            const editKey = `${row.employeeId}-${col.code}`;
                            const isEditing = editKey in editingCells;
                            const isVariable = item?.type === 'ALLOWANCE' && row.status === 'DRAFT';

                            return (
                              <td key={col.code} className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    className="w-24 rounded border border-indigo-300 bg-indigo-50 px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={editingCells[editKey]}
                                    onChange={(e) => updateEditValue(editKey, e.target.value)}
                                    onBlur={() => commitEdit(row, col.code)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') commitEdit(row, col.code);
                                      if (e.key === 'Escape') cancelEdit(row.employeeId, col.code);
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    className={isVariable ? 'cursor-pointer rounded px-1 hover:bg-indigo-50' : ''}
                                    onClick={isVariable ? () => startEdit(row.employeeId, col.code, item?.amount ?? 0) : undefined}
                                  >
                                    {formatKRW(getItemAmount(row, col.code))}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="whitespace-nowrap bg-blue-50/50 px-4 py-3 text-right text-sm font-semibold tabular-nums text-blue-700">
                            {formatKRW(row.totalPay)}
                          </td>
                          {deductionColumns.map((col) => (
                            <td key={col.code} className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-red-600">
                              {formatKRW(getItemAmount(row, col.code))}
                            </td>
                          ))}
                          <td className="whitespace-nowrap bg-red-50/50 px-4 py-3 text-right text-sm font-semibold tabular-nums text-red-700">
                            {formatKRW(row.totalDeduction)}
                          </td>
                          <td className="whitespace-nowrap bg-emerald-50/50 px-4 py-3 text-right text-sm font-bold tabular-nums text-emerald-700">
                            {formatKRW(row.netPay)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center">
                            <Checkbox
                              checked={row.isSkipped}
                              onChange={() => {
                                mutations.skipEmployee(row.employeeId, { reason: '스킵 처리' });
                              }}
                            />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={totalColSpan} className="bg-gray-50 p-0">
                              <PayrollDetailPanel detail={detail} isLoading={detailLoading} />
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Next button */}
          {rows.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setCurrentStep(1)}>
                다음 단계
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: 검토 */}
      {currentStep === 1 && (
        <div>
          {summaryLoading ? (
            <Spinner text="급여 요약 로딩중..." className="py-12" />
          ) : !summary ? (
            <EmptyState
              title="급여 요약이 없습니다"
              description="먼저 급여를 계산해주세요."
            />
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  title="총 지급액"
                  value={formatKRW(summary.totalPay)}
                  change={summary.changePercent}
                  changeLabel="전월 대비"
                />
                <StatCard
                  title="총 공제"
                  value={formatKRW(summary.totalDeduction)}
                />
                <StatCard
                  title="총 실수령"
                  value={formatKRW(summary.totalNetPay)}
                />
              </div>

              {/* Change from previous month */}
              {summary.previousMonthNetPay != null && (
                <Card className="mt-6">
                  <CardBody>
                    <div className="flex items-center gap-3">
                      {(summary.changePercent ?? 0) >= 0 ? (
                        <ArrowUp className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ArrowDown className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-700">전월 대비 변동</p>
                        <p className="text-xs text-gray-500">
                          전월 실수령: {formatKRW(summary.previousMonthNetPay)} / 금월: {formatKRW(summary.totalNetPay)} ({summary.changePercent ?? 0 >= 0 ? '+' : ''}{summary.changePercent}%)
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Warnings */}
              {summary.warnings.length > 0 && (
                <Card className="mt-6 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-700">
                      <AlertTriangle className="mr-2 inline h-4 w-4" />
                      이상치 경고
                    </CardTitle>
                    <Badge variant="warning">{summary.warnings.length}건</Badge>
                  </CardHeader>
                  <CardBody>
                    <ul className="space-y-2">
                      {summary.warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              )}

              {/* Department Breakdown */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>부서별 현황</CardTitle>
                </CardHeader>
                <CardBody className="p-0">
                  <Table
                    columns={[
                      { key: 'departmentName', label: '부서' },
                      { key: 'employeeCount', label: '인원' },
                      {
                        key: 'totalPay',
                        label: '총 지급액',
                        render: (row) => (
                          <span className="tabular-nums">{formatKRW((row as Record<string, unknown>).totalPay as number)}</span>
                        ),
                      },
                      {
                        key: 'totalNetPay',
                        label: '총 실수령',
                        render: (row) => (
                          <span className="font-semibold tabular-nums text-emerald-700">
                            {formatKRW((row as Record<string, unknown>).totalNetPay as number)}
                          </span>
                        ),
                      },
                    ]}
                    data={summary.byDepartment as unknown as Record<string, unknown>[]}
                  />
                </CardBody>
              </Card>
            </>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setCurrentStep(0)}>
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <Button onClick={() => setCurrentStep(2)}>
              다음 단계
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: 확정 */}
      {currentStep === 2 && (
        <div>
          {confirmed ? (
            <Card>
              <CardBody className="py-12 text-center">
                <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
                <h2 className="mt-4 text-xl font-semibold text-gray-800">
                  급여가 확정되었습니다
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  {year}년 {month}월 급여가 성공적으로 확정되었습니다.
                  급여대장과 급여명세서가 자동 생성됩니다.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button variant="secondary" onClick={() => { window.location.href = '/payroll/ledger'; }}>
                    급여대장 보기
                  </Button>
                  <Button variant="secondary" onClick={() => { window.location.href = '/payroll/payslips'; }}>
                    급여명세서 보기
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <>
              {/* Big Number Summary */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
                  <Banknote className="mx-auto h-6 w-6 text-blue-600" />
                  <p className="mt-2 text-xs font-medium text-blue-600">총 지급액</p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">{formatKRW(summary?.totalPay ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
                  <Banknote className="mx-auto h-6 w-6 text-red-500" />
                  <p className="mt-2 text-xs font-medium text-red-500">총 공제</p>
                  <p className="mt-1 text-2xl font-bold text-red-700">{formatKRW(summary?.totalDeduction ?? 0)}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center">
                  <Banknote className="mx-auto h-6 w-6 text-emerald-600" />
                  <p className="mt-2 text-xs font-medium text-emerald-600">총 실수령</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">{formatKRW(summary?.totalNetPay ?? 0)}</p>
                </div>
              </div>

              {/* Details Card */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>급여 확정 상세</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">급여 기간</p>
                        <p className="font-semibold text-gray-800">{year}년 {month}월</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">대상 인원</p>
                        <p className="font-semibold text-gray-800">{summary?.totalEmployees ?? rows.length}명</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">총 지급액</p>
                        <p className="font-semibold text-blue-700">{formatKRW(summary?.totalPay ?? 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">총 실수령</p>
                        <p className="font-semibold text-emerald-700">{formatKRW(summary?.totalNetPay ?? 0)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Expandable deduction breakdown */}
                  {summary?.byDepartment && summary.byDepartment.length > 0 && (
                    <details className="mt-6 rounded-lg border border-gray-200">
                      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                        부서별 내역 보기
                      </summary>
                      <div className="border-t border-gray-200 p-0">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">부서</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">인원</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">총 지급액</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">총 실수령</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(summary.byDepartment as Array<Record<string, unknown>>).map((dept, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 font-medium text-gray-700">{dept.departmentName as string}</td>
                                <td className="px-4 py-2 text-right tabular-nums">{dept.employeeCount as number}</td>
                                <td className="px-4 py-2 text-right tabular-nums">{formatKRW(dept.totalPay as number)}</td>
                                <td className="px-4 py-2 text-right tabular-nums font-semibold text-emerald-700">
                                  {formatKRW(dept.totalNetPay as number)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </CardBody>
              </Card>

              {/* Warning */}
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  확정 후 24시간 이내에 취소할 수 있습니다.
                </p>
                <p className="mt-1 text-xs text-amber-600">
                  확정 시 급여대장과 급여명세서가 자동 생성됩니다.
                </p>
              </div>

              {/* Navigation */}
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                  <ChevronLeft className="h-4 w-4" />
                  뒤로
                </Button>
                <Button onClick={() => setShowConfirmModal(true)} size="lg">
                  <CheckCircle2 className="h-5 w-5" />
                  급여 확정
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      <Modal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="급여 확정"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>
              취소
            </Button>
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming ? <Spinner size="sm" /> : '확정하기'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          {year}년 {month}월 급여를 확정하시겠습니까?
        </p>
        <p className="mt-2 text-sm text-gray-600">
          확정 후 급여대장과 급여명세서가 자동 생성됩니다.
        </p>
      </Modal>
    </div>
  );
}
