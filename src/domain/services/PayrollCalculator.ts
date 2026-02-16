/**
 * PayrollCalculator — Main 6-phase payroll engine orchestrator.
 *
 * Coordinates all phases of the monthly payroll calculation:
 *
 * Phase 0: Data Loading (handled by caller — data arrives via PayrollInput)
 * Phase 1: Ordinary Wage Calculation (통상임금 산정)
 * Phase 2: Gross Pay (총 지급액)
 * Phase 3: Tax-Exempt Separation (비과세 분리)
 * Phase 4: Deductions (공제)
 * Phase 5: Net Pay (실수령액)
 *
 * If any phase fails, returns status='FAILED' with the error message.
 * Successful calculations return status='DRAFT' (awaiting confirmation).
 */

import type { PayrollInput, PayrollResult } from './types';
import { OrdinaryWageCalculator } from './OrdinaryWageCalculator';
import { ProrationCalculator } from './ProrationCalculator';
import { GrossPayCalculator } from './GrossPayCalculator';
import { TaxExemptSeparator } from './TaxExemptSeparator';
import { DeductionCalculator } from './DeductionCalculator';

export class PayrollCalculator {
  /**
   * Execute the full 6-phase payroll calculation for one employee.
   * @param input All data needed for the calculation
   * @returns Complete payroll result including all sub-totals and net pay
   */
  static calculate(input: PayrollInput): PayrollResult {
    const now = new Date();

    try {
      // Phase 1: Ordinary Wage Calculation
      const ordinaryWage = OrdinaryWageCalculator.calculate(
        input.salaryItems,
        input.settings.monthlyWorkHours,
        input.employee.salaryType,
        input.employee.hourlyRate,
      );

      // Proration check for mid-month join/leave
      const proration = ProrationCalculator.calculate(
        input.year,
        input.month,
        input.employee.joinDate,
        input.employee.resignDate,
        input.settings.prorationMethod,
      );

      // Phase 2: Gross Pay
      const grossPay = GrossPayCalculator.calculate(
        input.salaryItems,
        input.attendance,
        ordinaryWage.hourlyOrdinaryWage,
        proration.ratio,
        input.employee.salaryType,
        input.employee.hourlyRate,
      );

      // Phase 3: Tax-Exempt Separation
      const taxExempt = TaxExemptSeparator.calculate(
        input.salaryItems,
        grossPay.totalPay,
        input.taxExemptLimits,
      );

      // Phase 4: Deductions
      const deductions = DeductionCalculator.calculate(
        taxExempt.taxableIncome,
        input.employee.dependents,
        {
          nationalPensionMode: input.employee.nationalPensionMode,
          healthInsuranceMode: input.employee.healthInsuranceMode,
          employmentInsuranceMode: input.employee.employmentInsuranceMode,
          manualNationalPensionBase: input.employee.manualNationalPensionBase,
          manualHealthInsuranceBase: input.employee.manualHealthInsuranceBase,
        },
        input.insuranceRates,
        input.taxBrackets,
        input.salaryItems,
        grossPay.totalPay,
        taxExempt.totalNonTaxable,
      );

      // Phase 5: Net Pay
      const netPay = grossPay.totalPay - deductions.totalDeduction;

      return {
        employeeId: input.employee.id,
        year: input.year,
        month: input.month,

        // Phase 1
        ordinaryWageMonthly: ordinaryWage.monthlyOrdinaryWage,
        ordinaryWageHourly: ordinaryWage.hourlyOrdinaryWage,
        ordinaryWageItems: ordinaryWage.items,

        // Phase 2
        basePay: grossPay.basePay,
        fixedAllowances: grossPay.fixedAllowances,
        overtimePay: grossPay.overtimePay,
        nightPay: grossPay.nightPay,
        nightOvertimePay: grossPay.nightOvertimePay,
        holidayPay: grossPay.holidayPay,
        holidayOvertimePay: grossPay.holidayOvertimePay,
        holidayNightPay: grossPay.holidayNightPay,
        holidayNightOvertimePay: grossPay.holidayNightOvertimePay,
        variableAllowances: grossPay.variableAllowances,
        attendanceDeductions: grossPay.attendanceDeductions,
        totalPay: grossPay.totalPay,

        // Phase 3
        totalNonTaxable: taxExempt.totalNonTaxable,
        taxableIncome: taxExempt.taxableIncome,
        nonTaxableItems: taxExempt.nonTaxableItems,

        // Phase 4
        nationalPension: deductions.nationalPension,
        healthInsurance: deductions.healthInsurance,
        longTermCare: deductions.longTermCare,
        employmentInsurance: deductions.employmentInsurance,
        incomeTax: deductions.incomeTax,
        localIncomeTax: deductions.localIncomeTax,
        totalDeduction: deductions.totalDeduction,

        // Phase 5
        netPay,

        // Metadata
        prorationApplied: proration.applied,
        prorationRatio: proration.applied ? proration.ratio : undefined,
        status: 'DRAFT',
        calculatedAt: now,
      };
    } catch (error) {
      // If any phase fails, return a FAILED result with the error
      return {
        employeeId: input.employee.id,
        year: input.year,
        month: input.month,

        // All financial fields zeroed out
        ordinaryWageMonthly: 0,
        ordinaryWageHourly: 0,
        ordinaryWageItems: [],
        basePay: 0,
        fixedAllowances: 0,
        overtimePay: 0,
        nightPay: 0,
        nightOvertimePay: 0,
        holidayPay: 0,
        holidayOvertimePay: 0,
        holidayNightPay: 0,
        holidayNightOvertimePay: 0,
        variableAllowances: 0,
        attendanceDeductions: 0,
        totalPay: 0,
        totalNonTaxable: 0,
        taxableIncome: 0,
        nonTaxableItems: [],
        nationalPension: 0,
        healthInsurance: 0,
        longTermCare: 0,
        employmentInsurance: 0,
        incomeTax: 0,
        localIncomeTax: 0,
        totalDeduction: 0,
        netPay: 0,

        prorationApplied: false,
        status: 'FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown calculation error',
        calculatedAt: now,
      };
    }
  }
}
