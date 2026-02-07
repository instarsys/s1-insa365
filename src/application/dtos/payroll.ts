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
  employeeName: string;
  employeeNumber: string | null;
  departmentName: string | null;
  year: number;
  month: number;
  status: string;

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
