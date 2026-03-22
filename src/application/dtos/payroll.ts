/**
 * Payroll-related DTOs.
 */

export interface CalculatePayrollDto {
  year: number;
  month: number;
}

export interface PayrollResultDto {
  id: string;
  employeeId: string;
  /** employeeId 별칭 (UseCase에서 userId로 참조) */
  userId: string;
  employeeName: string;
  employeeNumber: string | null;
  departmentName: string | null;
  year: number;
  month: number;
  payrollGroupId: string | null;
  status: string;
  confirmedAt: string | null;

  // Phase 1
  ordinaryWageMonthly: number;
  ordinaryWageHourly: number;

  // Phase 2
  basePay: number;
  fixedAllowances: number;
  overtimePay: number;
  nightPay: number;
  nightOvertimePay: number;
  holidayPay: number;
  holidayOvertimePay: number;
  holidayNightPay: number;
  holidayNightOvertimePay: number;
  variableAllowances: number;
  attendanceDeductions: number;
  totalPay: number;

  // Phase 3
  totalNonTaxable: number;
  taxableIncome: number;

  // Phase 4
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localIncomeTax: number;
  totalDeduction: number;

  // Phase 5
  netPay: number;

  // Metadata
  prorationApplied: boolean;
  prorationRatio: number | null;
  minimumWageWarning: boolean;
  errorMessage: string | null;
}

export interface PayrollSpreadsheetRowDto {
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  departmentName: string | null;
  positionName: string | null;
  status: string;
  basePay: number;
  fixedAllowances: number;
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  variableAllowances: number;
  attendanceDeductions: number;
  totalPay: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localIncomeTax: number;
  totalDeduction: number;
  netPay: number;
}

export interface PayrollSummaryDto {
  year: number;
  month: number;
  status: string;
  totalEmployees: number;
  calculatedCount: number;
  confirmedCount: number;
  failedCount: number;
  skippedCount: number;
  totalPay: number;
  totalDeduction: number;
  totalNetPay: number;
  previousMonth: {
    totalPay: number;
    totalNetPay: number;
  } | null;
}

export interface PayrollHistoryDto {
  year: number;
  month: number;
  status: string;
  employeeCount: number;
  totalPay: number;
  totalDeduction: number;
  totalNetPay: number;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

export interface UpdatePayrollItemDto {
  variableAllowances?: number;
  skipReason?: string;
}

export interface PayrollLedgerRowDto {
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  departmentName: string | null;
  basePay: number;
  fixedAllowances: number;
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  variableAllowances: number;
  totalPay: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localIncomeTax: number;
  totalDeduction: number;
  netPay: number;
}

export interface PayrollLedgerDto {
  year: number;
  month: number;
  companyName: string;
  rows: PayrollLedgerRowDto[];
  totals: {
    totalPay: number;
    totalDeduction: number;
    totalNetPay: number;
  };
}

// ─── 근태 검토 (Attendance Review) ────────────────────────

export interface UnconfirmedEmployeeDto {
  id: string;
  name: string;
  employeeNumber: string | null;
  departmentName: string | null;
}

export interface PendingLeaveDto {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
}

export interface AttendanceReviewDto {
  activeEmployeeCount: number;
  confirmedCount: number;
  unconfirmedEmployees: UnconfirmedEmployeeDto[];
  summary: {
    totalAbsentDays: number;
    totalLateDays: number;
    totalEarlyLeaveDays: number;
    totalLeaveDays: number;
    totalOvertimeHours: number;
    totalNightHours: number;
    totalHolidayHours: number;
  };
  pendingLeaveRequests: PendingLeaveDto[];
}

// ─── 급여 세부 내역 (Payroll Detail) ──────────────────────

export interface PayBreakdownItem {
  label: string;
  amount: number;
  hours?: number;
  rate?: number;
  multiplier?: number;
  description: string;
  editable?: boolean;
  itemCode?: string;
}

export interface DeductionBreakdownItem {
  label: string;
  amount: number;
  base?: number;
  rate?: number;
  description: string;
}

export interface PayrollDetailDto {
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
