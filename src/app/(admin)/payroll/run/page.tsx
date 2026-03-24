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
import { usePayrollGroups } from '@/hooks/usePayrollGroups';
import { formatKRW } from '@/lib/utils';
import Link from 'next/link';

const STEPS = [
  { label: '급여 입력', description: 'Step 1' },
  { label: '확정', description: 'Step 2' },
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
  payItems: { label: string; amount: number; description: string; editable?: boolean; itemCode?: string }[];
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

function PayrollDetailPanel({
  detail,
  isLoading,
  onUpdateVariableItem,
}: {
  detail: PayrollDetailData | undefined;
  isLoading: boolean;
  onUpdateVariableItem?: (itemCode: string, oldAmount: number, newAmount: number) => Promise<void>;
}) {
  const [editingItem, setEditingItem] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');

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

  const startItemEdit = (itemCode: string, currentAmount: number) => {
    setEditingItem(itemCode);
    setEditValue(String(currentAmount));
  };

  const commitItemEdit = async (item: { itemCode?: string; amount: number }) => {
    if (!editingItem || !onUpdateVariableItem || !item.itemCode) return;
    const newAmount = Number(editValue) || 0;
    if (newAmount !== item.amount) {
      await onUpdateVariableItem(item.itemCode, item.amount, newAmount);
    }
    setEditingItem(null);
  };

  const cancelItemEdit = () => {
    setEditingItem(null);
  };

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
            {detail.payItems.map((item, i) => {
              const isEditing = item.editable && editingItem === item.itemCode;
              return (
                <div key={i} className="flex items-baseline justify-between text-xs">
                  <div>
                    <span className="font-medium text-gray-700">{item.label}</span>
                    {!isEditing && <span className="ml-2 text-gray-400">{item.description}</span>}
                    {item.editable && !isEditing && (
                      <span className="ml-1 text-[10px] text-indigo-400">(변동)</span>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      className="ml-4 w-28 rounded border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-right text-xs tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitItemEdit(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitItemEdit(item);
                        if (e.key === 'Escape') cancelItemEdit();
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`ml-4 whitespace-nowrap font-medium tabular-nums ${item.amount < 0 ? 'text-red-600' : 'text-gray-800'} ${item.editable ? 'cursor-pointer rounded px-1 hover:bg-indigo-50' : ''}`}
                      onClick={item.editable && item.itemCode ? () => startItemEdit(item.itemCode!, item.amount) : undefined}
                    >
                      {formatKRW(item.amount)}
                    </span>
                  )}
                </div>
              );
            })}
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
  const [showCalcConfirmModal, setShowCalcConfirmModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [payrollGroupId, setPayrollGroupId] = useState('');

  const toast = useToast();
  const [expandedCalcId, setExpandedCalcId] = useState<string | null>(null);
  const { groups } = usePayrollGroups();

  // 그룹 로드 시 첫 번째 그룹 자동 선택
  React.useEffect(() => {
    if (groups.length > 0 && !payrollGroupId) {
      const defaultGroup = groups.find(g => g.isDefault) ?? groups[0];
      setPayrollGroupId(defaultGroup.id);
    }
  }, [groups, payrollGroupId]);

  const groupIdParam = payrollGroupId || undefined;
  const { rows, isLoading: spreadsheetLoading, mutate: mutateSpreadsheet } = usePayrollSpreadsheet(year, month, groupIdParam);
  const { summary, isLoading: summaryLoading } = usePayrollSummary(year, month, groupIdParam);
  const { review, isLoading: reviewLoading } = usePayrollAttendanceReview(year, month, groupIdParam);
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

  function handleCalculateClick() {
    if (selectedIds.size > 0) {
      handleCalculate(Array.from(selectedIds));
    } else {
      setShowCalcConfirmModal(true);
    }
  }

  async function handleCalculate(employeeIds?: string[]) {
    setShowCalcConfirmModal(false);
    setCalculating(true);
    try {
      await mutations.calculate({ year, month, payrollGroupId: groupIdParam, employeeIds });
      await mutateSpreadsheet();
      if (employeeIds) setSelectedIds(new Set());
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
      await mutations.confirm({ year, month, payrollGroupId: groupIdParam });
      setShowConfirmModal(false);
      setConfirmed(true);
      setCurrentStep(1);
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
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">급여 실행</h1>
        <Stepper steps={STEPS} currentStep={currentStep} className="w-64" />
      </div>

      {/* Step 1: 급여 입력 */}
      {currentStep === 0 && (
        <div>
          {/* 컨트롤 바 */}
          <div className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
            <Select
              options={yearOptions}
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              wrapperClassName="w-24"
            />
            <Select
              options={MONTH_OPTIONS}
              value={String(month)}
              onChange={(v) => setMonth(Number(v))}
              wrapperClassName="w-20"
            />
            {groups.length > 1 && (
              <Select
                options={groups.map(g => ({ value: g.id, label: g.name }))}
                value={payrollGroupId}
                onChange={(v) => setPayrollGroupId(v)}
                wrapperClassName="w-32"
              />
            )}
            {groups.length === 1 && (
              <span className="text-xs font-medium text-gray-600 rounded bg-gray-100 px-2 py-1">
                {groups[0].name}
              </span>
            )}
            <Button
              onClick={handleCalculateClick}
              disabled={calculating || (!reviewLoading && review != null && review.unconfirmedEmployees.length > 0) || summary?.status === 'CONFIRMED' || summary?.status === 'PAID'}
              size="sm"
            >
              {calculating ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Calculator className="h-3.5 w-3.5" />
                  {selectedIds.size > 0 ? `선택 계산 (${selectedIds.size}명)` : '계산하기'}
                </>
              )}
            </Button>
            {/* 근태 확정 완료 표시 */}
            {!reviewLoading && review && review.unconfirmedEmployees.length === 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {review.confirmedCount}/{review.activeEmployeeCount}명 근태 확정
              </span>
            )}
          </div>

          {/* 급여 확정 완료 안내 배너 */}
          {(summary?.status === 'CONFIRMED' || summary?.status === 'PAID') && (
            <div className="mb-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">
                  {year}년 {month}월 급여가 이미 {summary?.status === 'PAID' ? '지급' : '확정'}되었습니다.
                </span>
                <span className="text-xs text-blue-600">
                  확정된 급여는 수정할 수 없습니다.
                </span>
              </div>
            </div>
          )}

          {/* 근태 미확정 경고 배너 */}
          {!reviewLoading && review && review.unconfirmedEmployees.length > 0 && (
            <div className="mb-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">
                  근태 확정을 먼저 완료해주세요.
                </span>
                <span className="text-xs text-amber-600">
                  미확정 {review.unconfirmedEmployees.length}명 — 근태 확정 후 급여 계산이 가능합니다.
                </span>
                <Link href="/attendance" className="ml-auto shrink-0 rounded bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200">
                  근태 관리 바로가기
                </Link>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {review.unconfirmedEmployees.map((emp) => (
                  <span key={emp.id} className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                    {emp.name}{emp.departmentName && ` (${emp.departmentName})`}
                  </span>
                ))}
              </div>
            </div>
          )}


          {/* 미처리 휴가 경고 — 인라인 배너 */}
          {!reviewLoading && review && review.pendingLeaveRequests && review.pendingLeaveRequests.length > 0 && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="font-medium text-amber-700">미처리 휴가 {review.pendingLeaveRequests.length}건</span>
              <Link href="/leave" className="font-medium text-amber-700 underline hover:text-amber-900">휴가 관리</Link>
            </div>
          )}

          {/* Spreadsheet Table */}
          <Card>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <span className="text-sm font-semibold text-gray-800">{year}년 {month}월 급여 입력</span>
              <Badge variant="info">{rows.length}명</Badge>
            </div>
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
                        <th className="sticky left-0 z-10 bg-gray-50 px-1.5 py-2">
                          <Checkbox
                            checked={allSelected}
                            indeterminate={selectedIds.size > 0 && !allSelected}
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th className="sticky left-8 z-10 whitespace-nowrap bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-500">
                          사번
                        </th>
                        <th className="sticky left-[5.5rem] z-10 whitespace-nowrap bg-gray-50 px-2 py-2 text-left text-xs font-medium text-gray-500">
                          이름
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-left text-xs font-medium text-gray-500">
                          부서
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-gray-500">
                          기본급
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-blue-600">
                          수당
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-amber-600">
                          차감
                        </th>
                        <th className="whitespace-nowrap bg-blue-50 px-2 py-2 text-right text-xs font-bold text-blue-700">
                          총지급
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-red-600">
                          소득세
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-red-600">
                          지방소득세
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-red-600">
                          국민연금
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-red-600">
                          건강보험
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-red-600">
                          장기요양
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-red-600">
                          고용보험
                        </th>
                        <th className="whitespace-nowrap px-2 py-2 text-right text-xs font-medium text-red-600">
                          기타공제
                        </th>
                        <th className="whitespace-nowrap bg-red-50 px-2 py-2 text-right text-xs font-bold text-red-700">
                          총공제
                        </th>
                        <th className="whitespace-nowrap bg-emerald-50 px-2 py-2 text-right text-xs font-bold text-emerald-700">
                          실수령
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row) => {
                        const rowCalcId = (row as unknown as Record<string, string>).calculationId;
                        const isExpanded = expandedCalcId === rowCalcId;
                        const totalColSpan = 17; // checkbox + 사번 + 이름 + 부서 + 기본급 + 수당 + 차감 + 총지급 + 6 공제 + 기타공제 + 총공제 + 실수령
                        return (
                        <React.Fragment key={row.employeeId}>
                        <tr
                          className={`hover:bg-indigo-50/30 ${row.isSkipped ? 'bg-gray-50 opacity-60' : ''} ${row.status === 'SKIPPED' && row.skipReason === '근태 미확정' ? 'bg-amber-50/50' : ''} ${isExpanded ? 'bg-indigo-50/40' : ''}`}
                        >
                          <td className="sticky left-0 z-10 bg-white px-1.5 py-2">
                            <Checkbox
                              checked={selectedIds.has(row.employeeId)}
                              onChange={(c) => toggleSelect(row.employeeId, c)}
                            />
                          </td>
                          <td className="sticky left-8 z-10 whitespace-nowrap bg-white px-2 py-2 text-xs text-gray-500">
                            {row.employeeNumber}
                          </td>
                          <td className="sticky left-[5.5rem] z-10 whitespace-nowrap bg-white px-2 py-2 text-xs font-medium text-gray-800">
                            <div className="flex items-center gap-1">
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
                                <Badge variant="warning">미확정</Badge>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-xs text-gray-600">
                            {row.departmentName ?? '-'}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums">
                            {formatKRW(row.basePay)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums text-blue-600">
                            {formatKRW(row.fixedAllowances + row.overtimePay + row.nightPay + row.holidayPay + row.variableAllowances)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums text-amber-600">
                            {row.attendanceDeductions > 0 ? `-${formatKRW(row.attendanceDeductions)}` : formatKRW(0)}
                          </td>
                          <td className="whitespace-nowrap bg-blue-50/50 px-2 py-2 text-right text-xs font-semibold tabular-nums text-blue-700">
                            {formatKRW(row.totalPay)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums text-red-600">
                            {formatKRW(row.incomeTax)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums text-red-600">
                            {formatKRW(row.localIncomeTax)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums text-red-600">
                            {formatKRW(row.nationalPension)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums text-red-600">
                            {formatKRW(row.healthInsurance)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums text-red-600">
                            {formatKRW(row.longTermCare)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums text-red-600">
                            {formatKRW(row.employmentInsurance)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums text-red-600">
                            {formatKRW(Math.max(0, row.totalDeduction - row.incomeTax - row.localIncomeTax - row.nationalPension - row.healthInsurance - row.longTermCare - row.employmentInsurance))}
                          </td>
                          <td className="whitespace-nowrap bg-red-50/50 px-2 py-2 text-right text-xs font-semibold tabular-nums text-red-700">
                            {formatKRW(row.totalDeduction)}
                          </td>
                          <td className="whitespace-nowrap bg-emerald-50/50 px-2 py-2 text-right text-xs font-bold tabular-nums text-emerald-700">
                            {formatKRW(row.netPay)}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={totalColSpan} className="bg-gray-50 p-0">
                              <PayrollDetailPanel
                                detail={detail}
                                isLoading={detailLoading}
                                onUpdateVariableItem={async (_itemCode, oldAmount, newAmount) => {
                                  if (!rowCalcId || row.status !== 'DRAFT') return;
                                  const newTotal = row.variableAllowances - oldAmount + newAmount;
                                  await mutations.updateItem(rowCalcId, { variableAllowances: Math.max(0, newTotal) });
                                  await mutations.calculate({ year, month, payrollGroupId: groupIdParam, employeeIds: [row.employeeId] });
                                  await mutateSpreadsheet();
                                }}
                              />
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

          {/* 확정 버튼 */}
          {rows.length > 0 && rows.some(r => r.status === 'DRAFT') && (
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setShowConfirmModal(true)} size="lg">
                <CheckCircle2 className="h-5 w-5" />
                급여 확정
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: 확정 완료 */}
      {currentStep === 1 && (
        <div>
          {!confirmed ? (
            <EmptyState
              title="급여가 아직 확정되지 않았습니다"
              description="먼저 급여를 계산해주세요."
            />
          ) : (
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
                  <Button variant="ghost" onClick={() => setCurrentStep(0)}>
                    급여 입력으로 돌아가기
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Calculate Confirm Modal */}
      <Modal
        open={showCalcConfirmModal}
        onClose={() => setShowCalcConfirmModal(false)}
        title="전체 급여 계산"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCalcConfirmModal(false)}>
              취소
            </Button>
            <Button onClick={() => handleCalculate()} disabled={calculating}>
              {calculating ? <Spinner size="sm" /> : '전체 계산하기'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          급여그룹 전체 직원의 급여를 계산합니다. 계속 진행할까요?
        </p>
        <p className="mt-2 text-xs text-gray-400">
          직원을 개별 선택한 후 계산할 수도 있습니다.
        </p>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={`${year}년 ${month}월 급여 확정`}
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
        {/* 급여 그룹 표시 */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <span>급여그룹:</span>
          <span className="font-semibold text-gray-800">
            {payrollGroupId ? groups.find(g => g.id === payrollGroupId)?.name ?? '선택된 그룹' : '전체'}
          </span>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-[10px] font-medium text-blue-600">총 지급</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-blue-700">
              {formatKRW(rows.filter(r => r.status !== 'SKIPPED').reduce((s, r) => s + r.totalPay, 0))}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center">
            <p className="text-[10px] font-medium text-red-500">총 공제</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-red-700">
              {formatKRW(rows.filter(r => r.status !== 'SKIPPED').reduce((s, r) => s + r.totalDeduction, 0))}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-center">
            <p className="text-[10px] font-medium text-emerald-600">총 실수령</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-emerald-700">
              {formatKRW(rows.filter(r => r.status !== 'SKIPPED').reduce((s, r) => s + r.netPay, 0))}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          대상 {rows.filter(r => r.status !== 'SKIPPED').length}명 · 확정 후 급여대장과 급여명세서가 자동 생성됩니다.
        </p>
        <p className="mt-1 text-xs text-red-600">
          확정 후에는 수정하거나 취소할 수 없습니다. 반드시 확인 후 확정해주세요.
        </p>
      </Modal>
    </div>
  );
}
