/**
 * Shared types for the 6-phase payroll calculation engine.
 *
 * PayrollInput: All data needed to calculate one employee's monthly payroll.
 * PayrollResult: Complete calculation output including all sub-totals.
 */

import type { SalaryItemProps } from '../entities/SalaryItem';
import type { AttendanceSummary } from '../entities/AttendanceRecord';

/** Insurance rates for one calculation period (date-range based, not yearly) */
export interface InsuranceRateSet {
  nationalPension: { rate: number; minBase: number; maxBase: number };
  healthInsurance: { rate: number; minBase: number; maxBase: number };
  longTermCare: { rate: number };
  employmentInsurance: { rate: number };
}

/** One row from the simplified tax table (간이세액표) */
export interface TaxBracketEntry {
  minIncome: number;
  maxIncome: number;
  dependents: number;
  taxAmount: number;
}

/** Non-taxable limit for a specific tax-exempt category */
export interface TaxExemptLimitEntry {
  /** e.g., 'MEALS', 'VEHICLE', 'CHILDCARE' */
  code: string;
  name: string;
  /** Monthly limit in KRW, e.g., 200000 */
  monthlyLimit: number;
}

/** Company-level payroll settings */
export interface PayrollSettings {
  /** Standard monthly work hours (default: 209) */
  monthlyWorkHours: number;
  /** How to calculate proration for mid-month joins/leaves */
  prorationMethod: 'CALENDAR_DAY' | 'WORKING_DAY';
  /** Night work start time, e.g., "22:00" */
  nightWorkStart: string;
  /** Night work end time, e.g., "06:00" */
  nightWorkEnd: string;
}

/** Complete input for calculating one employee's monthly payroll */
export interface PayrollInput {
  employee: {
    id: string;
    name: string;
    dependents: number;
    joinDate: Date;
    resignDate?: Date;
    nationalPensionMode: 'AUTO' | 'MANUAL' | 'NONE';
    healthInsuranceMode: 'AUTO' | 'MANUAL' | 'NONE';
    employmentInsuranceMode: 'AUTO' | 'MANUAL' | 'NONE';
    manualNationalPensionBase?: number;
    manualHealthInsuranceBase?: number;
  };
  salaryItems: SalaryItemProps[];
  attendance: AttendanceSummary;
  insuranceRates: InsuranceRateSet;
  taxBrackets: TaxBracketEntry[];
  taxExemptLimits: TaxExemptLimitEntry[];
  settings: PayrollSettings;
  year: number;
  month: number;
}

/** Complete output of the 6-phase payroll calculation */
export interface PayrollResult {
  employeeId: string;
  year: number;
  month: number;

  // Phase 1: Ordinary Wage
  ordinaryWageMonthly: number;
  ordinaryWageHourly: number;
  ordinaryWageItems: { code: string; name: string; monthlyAmount: number }[];

  // Phase 2: Gross Pay
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

  // Phase 3: Tax-Exempt Separation
  totalNonTaxable: number;
  taxableIncome: number;
  nonTaxableItems: {
    code: string;
    name: string;
    amount: number;
    limit: number;
    applied: number;
  }[];

  // Phase 4: Deductions
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localIncomeTax: number;
  totalDeduction: number;

  // Phase 5: Net Pay
  netPay: number;

  // Metadata
  prorationApplied: boolean;
  prorationRatio?: number;
  minimumWageWarning?: boolean;
  status: 'DRAFT' | 'FAILED' | 'SKIPPED';
  errorMessage?: string;
  calculatedAt: Date;
}
