'use client';

import useSWR from 'swr';
import { fetcher, apiPost, apiPut } from '@/lib/api';

interface PayrollSpreadsheetRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName?: string;
  basePay: number;
  items: { code: string; name: string; amount: number; type: string }[];
  totalPay: number;
  totalDeduction: number;
  netPay: number;
  status: string;
  isSkipped: boolean;
  skipReason?: string;
  calculationId?: string;
}

interface AttendanceReview {
  activeEmployeeCount: number;
  confirmedCount: number;
  unconfirmedEmployees: { id: string; name: string; employeeNumber: string | null; departmentName: string | null }[];
  summary: {
    totalAbsentDays: number;
    totalLateDays: number;
    totalEarlyLeaveDays: number;
    totalLeaveDays: number;
    totalOvertimeHours: number;
    totalNightHours: number;
    totalHolidayHours: number;
  };
}

interface PayBreakdownItem {
  label: string;
  amount: number;
  hours?: number;
  rate?: number;
  multiplier?: number;
  description: string;
}

interface DeductionBreakdownItem {
  label: string;
  amount: number;
  base?: number;
  rate?: number;
  description: string;
}

interface PayrollDetail {
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
    nightOvertimeMinutes: number;
    holidayMinutes: number;
    holidayOvertimeMinutes: number;
    holidayNightMinutes: number;
    holidayNightOvertimeMinutes: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
  } | null;
  payItems: PayBreakdownItem[];
  totalPay: number;
  totalNonTaxable: number;
  taxableIncome: number;
  deductionItems: DeductionBreakdownItem[];
  totalDeduction: number;
  netPay: number;
  prorationApplied: boolean;
  prorationRatio: number | null;
  minimumWageWarning: boolean;
}

interface PayrollSummary {
  year: number;
  month: number;
  totalEmployees: number;
  totalPay: number;
  totalDeduction: number;
  totalNetPay: number;
  previousMonthNetPay?: number;
  changePercent?: number;
  warnings: string[];
  byDepartment: {
    departmentName: string;
    employeeCount: number;
    totalPay: number;
    totalNetPay: number;
  }[];
}

interface PayrollHistoryItem {
  year: number;
  month: number;
  totalEmployees: number;
  totalPay: number;
  totalDeduction: number;
  totalNetPay: number;
  status: string;
  confirmedAt?: string;
  // Phase 2: Gross Pay breakdown
  basePay?: number;
  fixedAllowances?: number;
  overtimePay?: number;
  nightPay?: number;
  holidayPay?: number;
  variableAllowances?: number;
  totalNonTaxable?: number;
  // Phase 4: Deduction breakdown
  nationalPension?: number;
  healthInsurance?: number;
  longTermCare?: number;
  employmentInsurance?: number;
  incomeTax?: number;
  localIncomeTax?: number;
  netPay?: number;
}

interface PayrollHistory {
  items: PayrollHistoryItem[];
}

export function usePayrollSpreadsheet(year: number, month: number) {
  const { data, error, isLoading, mutate } = useSWR<{ items: PayrollSpreadsheetRow[] }>(
    `/api/payroll/spreadsheet?year=${year}&month=${month}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  return { rows: data?.items ?? [], isLoading, error, mutate };
}

export function usePayrollSummary(year: number, month: number) {
  const { data, error, isLoading } = useSWR<PayrollSummary>(
    `/api/payroll/summary?year=${year}&month=${month}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  return { summary: data, isLoading, error };
}

export function usePayrollHistory(page?: number) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));

  const { data, error, isLoading } = useSWR<PayrollHistory>(
    `/api/payroll/history?${params}`,
    fetcher,
    { revalidateOnFocus: true },
  );

  return { history: data?.items ?? [], isLoading, error };
}

export function usePayrollMutations() {
  return {
    calculate: (data: { year: number; month: number }) => apiPost('/api/payroll/calculate', data),
    updateItem: (id: string, data: Record<string, unknown>) => apiPut(`/api/payroll/${id}`, data),
    confirm: (data: { year: number; month: number }) => apiPost('/api/payroll/confirm', data),
    cancel: (data: { year: number; month: number }) => apiPost('/api/payroll/cancel', data),
    skipEmployee: (id: string, data: { reason: string }) => apiPost(`/api/payroll/${id}/skip`, data),
  };
}

export function usePayrollAttendanceReview(year: number, month: number) {
  const { data, error, isLoading } = useSWR<AttendanceReview>(
    `/api/payroll/attendance-review?year=${year}&month=${month}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  return { review: data, isLoading, error };
}

export function usePayrollDetail(calculationId: string | null) {
  const { data, error, isLoading } = useSWR<PayrollDetail>(
    calculationId ? `/api/payroll/${calculationId}/detail` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  return { detail: data, isLoading, error };
}

export function usePayrollLedger(year: number, month: number) {
  const { data, error, isLoading } = useSWR(
    `/api/payroll/ledger?year=${year}&month=${month}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  return { ledger: data, isLoading, error };
}
