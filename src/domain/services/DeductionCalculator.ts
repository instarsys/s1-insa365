/**
 * DeductionCalculator — Phase 4 of the payroll engine.
 *
 * Orchestrates all deduction calculations:
 * 1. 4 social insurances (InsuranceCalculator)
 * 2. Income tax + local income tax (TaxCalculator)
 * 3. Other deductions from salary items (union dues, loan repayments, etc.)
 *
 * totalDeduction = insurance + taxes + otherDeductions
 */

import type { SalaryItemProps } from '../entities/SalaryItem';
import { SalaryItem } from '../entities/SalaryItem';
import { InsuranceCalculator, type InsuranceResult, type InsuranceModes } from './InsuranceCalculator';
import { TaxCalculator, type TaxResult } from './TaxCalculator';
import type { InsuranceRateSet, TaxBracketEntry } from './types';

export interface DeductionResult {
  // Insurance
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  // Tax
  incomeTax: number;
  localIncomeTax: number;
  // Other
  otherDeductions: number;
  // Total
  totalDeduction: number;
}

export class DeductionCalculator {
  /**
   * Calculate all deductions for an employee.
   * @param taxableIncome Taxable income from Phase 3
   * @param dependents Number of dependents for tax bracket lookup
   * @param insuranceModes Per-employee insurance mode settings
   * @param insuranceRates Insurance rate set for the period
   * @param taxBrackets Simplified tax table
   * @param salaryItemProps All salary items (for extracting non-standard deductions)
   */
  static calculate(
    taxableIncome: number,
    dependents: number,
    insuranceModes: InsuranceModes,
    insuranceRates: InsuranceRateSet,
    taxBrackets: TaxBracketEntry[],
    salaryItemProps: SalaryItemProps[],
  ): DeductionResult {
    // 1. Insurance premiums
    const insurance: InsuranceResult = InsuranceCalculator.calculate(
      taxableIncome,
      insuranceRates,
      insuranceModes,
    );

    // 2. Income tax
    const tax: TaxResult = TaxCalculator.calculate(
      taxableIncome,
      dependents,
      taxBrackets,
    );

    // 3. Other deductions from salary items
    //    These are DEDUCTION-type items that are NOT the standard 4 insurances or taxes
    //    (those are calculated above). These might include union dues, loan repayment, etc.
    //    Note: Standard deduction items (D01-D06 for insurance/tax) are handled by
    //    the insurance and tax calculators above. Only non-standard deductions are summed here.
    const items = salaryItemProps.map((p) => new SalaryItem(p));
    const standardDeductionCodes = new Set([
      'D01', 'D02', 'D03', 'D04', 'D05', 'D06', // Standard insurance + tax codes
    ]);
    const otherDeductions = items
      .filter(
        (item) =>
          item.isDeduction() &&
          item.isFixed() &&
          !standardDeductionCodes.has(item.code),
      )
      .reduce((sum, item) => sum + item.amount, 0);

    const totalDeduction =
      insurance.totalInsurance + tax.totalTax + otherDeductions;

    return {
      nationalPension: insurance.nationalPension,
      healthInsurance: insurance.healthInsurance,
      longTermCare: insurance.longTermCare,
      employmentInsurance: insurance.employmentInsurance,
      incomeTax: tax.incomeTax,
      localIncomeTax: tax.localIncomeTax,
      otherDeductions,
      totalDeduction,
    };
  }
}
