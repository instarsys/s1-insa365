import { describe, it, expect } from 'vitest';
import { DeductionCalculator } from '../DeductionCalculator';
import type { InsuranceModes } from '../InsuranceCalculator';
import type { InsuranceRateSet, TaxBracketEntry } from '../types';
import type { SalaryItemProps } from '../../entities/SalaryItem';

const RATES: InsuranceRateSet = {
  nationalPension: { rate: 0.045, minBase: 390_000, maxBase: 6_170_000 },
  healthInsurance: { rate: 0.03545, minBase: 279_000, maxBase: 12_706_000 },
  longTermCare: { rate: 0.1295 },
  employmentInsurance: { rate: 0.009 },
};

const BRACKETS: TaxBracketEntry[] = [
  { minIncome: 2_500_000, maxIncome: 3_000_000, dependents: 1, taxAmount: 105_430 },
  { minIncome: 3_000_000, maxIncome: 3_500_000, dependents: 1, taxAmount: 155_940 },
];

const AUTO_MODES: InsuranceModes = {
  nationalPensionMode: 'AUTO',
  healthInsuranceMode: 'AUTO',
  employmentInsuranceMode: 'AUTO',
};

const BASE_ITEMS: SalaryItemProps[] = [
  {
    id: '1', code: 'B01', name: '기본급', type: 'BASE',
    paymentType: 'FIXED', paymentCycle: 'MONTHLY',
    amount: 3_000_000, isOrdinaryWage: true, isTaxExempt: false,
  },
];

describe('DeductionCalculator', () => {
  describe('combined deductions', () => {
    it('should calculate all deductions for typical salary', () => {
      const result = DeductionCalculator.calculate(
        3_000_000, 1, AUTO_MODES, RATES, BRACKETS, BASE_ITEMS,
      );

      // Insurance
      expect(result.nationalPension).toBe(135_000);
      expect(result.healthInsurance).toBe(Math.floor(3_000_000 * 0.03545));
      expect(result.longTermCare).toBe(Math.floor(result.healthInsurance * 0.1295));
      expect(result.employmentInsurance).toBe(Math.floor(3_000_000 * 0.009));

      // Tax
      expect(result.incomeTax).toBe(155_940);
      expect(result.localIncomeTax).toBe(Math.floor(155_940 * 0.1));

      // Total
      const expectedTotal =
        result.nationalPension +
        result.healthInsurance +
        result.longTermCare +
        result.employmentInsurance +
        result.incomeTax +
        result.localIncomeTax +
        result.otherDeductions;
      expect(result.totalDeduction).toBe(expectedTotal);
    });
  });

  describe('other deductions', () => {
    it('should include non-standard deduction items', () => {
      const items: SalaryItemProps[] = [
        ...BASE_ITEMS,
        {
          id: '10', code: 'D07', name: '노조비', type: 'DEDUCTION',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 30_000, isOrdinaryWage: false, isTaxExempt: false,
        },
        {
          id: '11', code: 'D08', name: '대출상환', type: 'DEDUCTION',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 50_000, isOrdinaryWage: false, isTaxExempt: false,
        },
      ];
      const result = DeductionCalculator.calculate(
        3_000_000, 1, AUTO_MODES, RATES, BRACKETS, items,
      );

      expect(result.otherDeductions).toBe(80_000);
    });

    it('should exclude standard deduction codes (D01-D06)', () => {
      const items: SalaryItemProps[] = [
        ...BASE_ITEMS,
        {
          id: '10', code: 'D01', name: '국민연금', type: 'DEDUCTION',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 135_000, isOrdinaryWage: false, isTaxExempt: false,
        },
        {
          id: '11', code: 'D07', name: '노조비', type: 'DEDUCTION',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 30_000, isOrdinaryWage: false, isTaxExempt: false,
        },
      ];
      const result = DeductionCalculator.calculate(
        3_000_000, 1, AUTO_MODES, RATES, BRACKETS, items,
      );

      // D01 is excluded (standard), only D07 counts
      expect(result.otherDeductions).toBe(30_000);
    });
  });

  describe('insurance modes', () => {
    it('should zero out individual insurances when mode is NONE', () => {
      const modes: InsuranceModes = {
        nationalPensionMode: 'NONE',
        healthInsuranceMode: 'AUTO',
        employmentInsuranceMode: 'NONE',
      };
      const result = DeductionCalculator.calculate(
        3_000_000, 1, modes, RATES, BRACKETS, BASE_ITEMS,
      );

      expect(result.nationalPension).toBe(0);
      expect(result.healthInsurance).toBeGreaterThan(0);
      expect(result.employmentInsurance).toBe(0);
    });
  });

  describe('total deduction integrity', () => {
    it('totalDeduction should equal sum of all components', () => {
      const items: SalaryItemProps[] = [
        ...BASE_ITEMS,
        {
          id: '10', code: 'D09', name: '기타공제', type: 'DEDUCTION',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 25_000, isOrdinaryWage: false, isTaxExempt: false,
        },
      ];
      const result = DeductionCalculator.calculate(
        3_000_000, 1, AUTO_MODES, RATES, BRACKETS, items,
      );

      const computed =
        result.nationalPension +
        result.healthInsurance +
        result.longTermCare +
        result.employmentInsurance +
        result.incomeTax +
        result.localIncomeTax +
        result.otherDeductions;

      expect(result.totalDeduction).toBe(computed);
    });
  });
});
