/**
 * DeductionCalculator — Phase 4 of the payroll engine.
 *
 * Orchestrates all deduction calculations:
 * 1. 4 social insurances (InsuranceCalculator or FormulaEngine)
 * 2. Income tax + local income tax (TaxCalculator or FormulaEngine)
 * 3. Other deductions from salary items (union dues, loan repayments, etc.)
 *
 * totalDeduction = insurance + taxes + otherDeductions
 */

import type { SalaryItemProps } from '../entities/SalaryItem';
import { SalaryItem } from '../entities/SalaryItem';
import { InsuranceCalculator, type InsuranceResult, type InsuranceModes } from './InsuranceCalculator';
import { TaxCalculator, type TaxResult } from './TaxCalculator';
import { FormulaEngine } from './FormulaEngine';
import type { FormulaContextWithTax, TaxBracketForFormula } from './FormulaEngine';
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

/** 레거시 공제 키워드 목록 */
const LEGACY_DEDUCTION_KEYWORDS = new Set([
  'NATIONAL_PENSION', 'HEALTH_INSURANCE', 'LONG_TERM_CARE',
  'EMPLOYMENT_INSURANCE', 'INCOME_TAX', 'LOCAL_INCOME_TAX',
]);

export function isLegacyDeductionKeyword(formula: string | undefined): boolean {
  return !!formula && LEGACY_DEDUCTION_KEYWORDS.has(formula);
}

/** FormulaEngine에 전달할 공제 컨텍스트 빌드 */
export function buildDeductionContext(
  taxableIncome: number,
  totalPay: number,
  totalNonTaxable: number,
  dependents: number,
  insuranceRates: InsuranceRateSet,
  taxBrackets: TaxBracketEntry[],
): FormulaContextWithTax {
  return {
    과세소득: taxableIncome,
    비과세합계: totalNonTaxable,
    총지급액: totalPay,
    연금기준소득: taxableIncome,
    건강보험기준소득: taxableIncome,
    연금하한: insuranceRates.nationalPension.minBase,
    연금상한: insuranceRates.nationalPension.maxBase,
    국민연금요율: insuranceRates.nationalPension.rate * 100,
    건강보험요율: insuranceRates.healthInsurance.rate * 100,
    장기요양요율: insuranceRates.longTermCare.rate * 100,
    고용보험요율: insuranceRates.employmentInsurance.rate * 100,
    부양가족수: dependents,
    __taxBrackets__: taxBrackets.map((b) => ({
      minIncome: b.minIncome,
      maxIncome: b.maxIncome,
      dependents: b.dependents,
      taxAmount: b.taxAmount,
    })) as TaxBracketForFormula[],
  };
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
   * @param totalPay Optional total pay for formula context
   * @param totalNonTaxable Optional total non-taxable for formula context
   */
  static calculate(
    taxableIncome: number,
    dependents: number,
    insuranceModes: InsuranceModes,
    insuranceRates: InsuranceRateSet,
    taxBrackets: TaxBracketEntry[],
    salaryItemProps: SalaryItemProps[],
    totalPay?: number,
    totalNonTaxable?: number,
  ): DeductionResult {
    const items = salaryItemProps.map((p) => new SalaryItem(p));

    // Check if any deduction item uses new formula (non-legacy)
    const standardDeductionCodes = new Set(['D01', 'D02', 'D03', 'D04', 'D05', 'D06']);
    const formulaDeductions = items.filter(
      (item) =>
        item.isDeduction() &&
        item.isFormula() &&
        standardDeductionCodes.has(item.code) &&
        item.formula &&
        !isLegacyDeductionKeyword(item.formula),
    );

    if (formulaDeductions.length > 0) {
      // 새 수식 엔진 경로: 공제 항목을 순서대로 FormulaEngine으로 계산
      return DeductionCalculator.calculateWithFormula(
        taxableIncome,
        dependents,
        insuranceModes,
        insuranceRates,
        taxBrackets,
        items,
        standardDeductionCodes,
        totalPay ?? taxableIncome,
        totalNonTaxable ?? 0,
      );
    }

    // 레거시 호환 경로: InsuranceCalculator + TaxCalculator
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

  /** 새 수식 엔진으로 공제 계산. 공제 순서 의존성 처리 (D03→D02, D06→D05). */
  private static calculateWithFormula(
    taxableIncome: number,
    dependents: number,
    insuranceModes: InsuranceModes,
    insuranceRates: InsuranceRateSet,
    taxBrackets: TaxBracketEntry[],
    items: SalaryItem[],
    standardDeductionCodes: Set<string>,
    totalPay: number,
    totalNonTaxable: number,
  ): DeductionResult {
    const ctx = buildDeductionContext(
      taxableIncome,
      totalPay,
      totalNonTaxable,
      dependents,
      insuranceRates,
      taxBrackets,
    );

    // D01~D06를 순서대로 계산, 이전 결과를 context에 누적
    let nationalPension = 0;
    let healthInsurance = 0;
    let longTermCare = 0;
    let employmentInsurance = 0;
    let incomeTax = 0;
    let localIncomeTax = 0;

    const deductionOrder = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06'];

    for (const code of deductionOrder) {
      const item = items.find((i) => i.code === code && i.isDeduction());
      if (!item) continue;

      let amount = 0;

      if (item.isFormula() && item.formula) {
        if (isLegacyDeductionKeyword(item.formula)) {
          // 레거시 키워드 → 기존 계산기
          amount = DeductionCalculator.calculateLegacyDeduction(
            item.formula,
            taxableIncome,
            dependents,
            insuranceModes,
            insuranceRates,
            taxBrackets,
            healthInsurance,
          );
        } else {
          // 새 수식 엔진
          amount = FormulaEngine.evaluate(item.formula, ctx);
        }
      } else if (item.isFixed()) {
        amount = item.amount;
      }

      // 결과 저장 + context에 누적
      switch (code) {
        case 'D01':
          nationalPension = amount;
          ctx['국민연금'] = amount;
          break;
        case 'D02':
          healthInsurance = amount;
          ctx['건강보험'] = amount;
          break;
        case 'D03':
          longTermCare = amount;
          break;
        case 'D04':
          employmentInsurance = amount;
          break;
        case 'D05':
          incomeTax = amount;
          ctx['소득세'] = amount;
          break;
        case 'D06':
          localIncomeTax = amount;
          break;
      }
    }

    // Other deductions (D07+)
    const otherDeductions = items
      .filter(
        (item) =>
          item.isDeduction() &&
          item.isFixed() &&
          !standardDeductionCodes.has(item.code),
      )
      .reduce((sum, item) => sum + item.amount, 0);

    const totalDeduction =
      nationalPension +
      healthInsurance +
      longTermCare +
      employmentInsurance +
      incomeTax +
      localIncomeTax +
      otherDeductions;

    return {
      nationalPension,
      healthInsurance,
      longTermCare,
      employmentInsurance,
      incomeTax,
      localIncomeTax,
      otherDeductions,
      totalDeduction,
    };
  }

  /** 레거시 키워드 → 개별 공제 계산 */
  private static calculateLegacyDeduction(
    keyword: string,
    taxableIncome: number,
    dependents: number,
    insuranceModes: InsuranceModes,
    insuranceRates: InsuranceRateSet,
    taxBrackets: TaxBracketEntry[],
    healthInsurance: number,
  ): number {
    switch (keyword) {
      case 'NATIONAL_PENSION': {
        const result = InsuranceCalculator.calculate(taxableIncome, insuranceRates, insuranceModes);
        return result.nationalPension;
      }
      case 'HEALTH_INSURANCE': {
        const result = InsuranceCalculator.calculate(taxableIncome, insuranceRates, insuranceModes);
        return result.healthInsurance;
      }
      case 'LONG_TERM_CARE': {
        if (insuranceModes.healthInsuranceMode === 'NONE') return 0;
        return Math.floor(healthInsurance * insuranceRates.longTermCare.rate);
      }
      case 'EMPLOYMENT_INSURANCE': {
        const result = InsuranceCalculator.calculate(taxableIncome, insuranceRates, insuranceModes);
        return result.employmentInsurance;
      }
      case 'INCOME_TAX': {
        const result = TaxCalculator.calculate(taxableIncome, dependents, taxBrackets);
        return result.incomeTax;
      }
      case 'LOCAL_INCOME_TAX': {
        const result = TaxCalculator.calculate(taxableIncome, dependents, taxBrackets);
        return result.localIncomeTax;
      }
      default:
        return 0;
    }
  }
}
