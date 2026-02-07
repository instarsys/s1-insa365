import { describe, it, expect } from 'vitest';
import { TaxCalculator } from '../TaxCalculator';
import type { TaxBracketEntry } from '../types';

// Sample simplified tax table entries
const TAX_BRACKETS: TaxBracketEntry[] = [
  // 1 dependent
  { minIncome: 0, maxIncome: 1_060_000, dependents: 1, taxAmount: 0 },
  { minIncome: 1_060_000, maxIncome: 1_500_000, dependents: 1, taxAmount: 19_970 },
  { minIncome: 1_500_000, maxIncome: 2_000_000, dependents: 1, taxAmount: 38_960 },
  { minIncome: 2_000_000, maxIncome: 2_500_000, dependents: 1, taxAmount: 62_810 },
  { minIncome: 2_500_000, maxIncome: 3_000_000, dependents: 1, taxAmount: 105_430 },
  { minIncome: 3_000_000, maxIncome: 3_500_000, dependents: 1, taxAmount: 155_940 },
  { minIncome: 3_500_000, maxIncome: 4_000_000, dependents: 1, taxAmount: 190_960 },
  { minIncome: 4_000_000, maxIncome: 5_000_000, dependents: 1, taxAmount: 240_000 },
  // 2 dependents
  { minIncome: 0, maxIncome: 1_060_000, dependents: 2, taxAmount: 0 },
  { minIncome: 1_060_000, maxIncome: 1_500_000, dependents: 2, taxAmount: 9_970 },
  { minIncome: 1_500_000, maxIncome: 2_000_000, dependents: 2, taxAmount: 28_960 },
  { minIncome: 2_000_000, maxIncome: 2_500_000, dependents: 2, taxAmount: 52_810 },
  { minIncome: 2_500_000, maxIncome: 3_000_000, dependents: 2, taxAmount: 87_830 },
  { minIncome: 3_000_000, maxIncome: 3_500_000, dependents: 2, taxAmount: 130_430 },
  { minIncome: 3_500_000, maxIncome: 4_000_000, dependents: 2, taxAmount: 163_590 },
  // 3 dependents
  { minIncome: 2_500_000, maxIncome: 3_000_000, dependents: 3, taxAmount: 70_230 },
  { minIncome: 3_000_000, maxIncome: 3_500_000, dependents: 3, taxAmount: 105_740 },
  // 4 dependents
  { minIncome: 3_000_000, maxIncome: 3_500_000, dependents: 4, taxAmount: 81_050 },
];

describe('TaxCalculator', () => {
  describe('exact bracket matching', () => {
    it('should find correct tax for 1 dependent at 3M income', () => {
      const result = TaxCalculator.calculate(3_000_000, 1, TAX_BRACKETS);

      expect(result.incomeTax).toBe(155_940);
      expect(result.localIncomeTax).toBe(Math.floor(155_940 * 0.1)); // 15,594
      expect(result.totalTax).toBe(155_940 + 15_594);
    });

    it('should find correct tax for 2 dependents at 2.5M income', () => {
      const result = TaxCalculator.calculate(2_500_000, 2, TAX_BRACKETS);

      expect(result.incomeTax).toBe(87_830);
    });

    it('should find correct tax for 3 dependents at 3M income', () => {
      const result = TaxCalculator.calculate(3_000_000, 3, TAX_BRACKETS);

      expect(result.incomeTax).toBe(105_740);
    });
  });

  describe('zero / below minimum', () => {
    it('should return 0 tax for zero income', () => {
      const result = TaxCalculator.calculate(0, 1, TAX_BRACKETS);

      expect(result.incomeTax).toBe(0);
      expect(result.localIncomeTax).toBe(0);
      expect(result.totalTax).toBe(0);
    });

    it('should return 0 tax for negative income', () => {
      const result = TaxCalculator.calculate(-100_000, 1, TAX_BRACKETS);

      expect(result.incomeTax).toBe(0);
    });

    it('should return 0 tax when below first bracket', () => {
      const result = TaxCalculator.calculate(500_000, 1, TAX_BRACKETS);

      expect(result.incomeTax).toBe(0);
    });
  });

  describe('local income tax', () => {
    it('should be exactly 10% of income tax, floored', () => {
      const result = TaxCalculator.calculate(2_800_000, 1, TAX_BRACKETS);

      expect(result.incomeTax).toBe(105_430);
      // 105,430 * 0.1 = 10,543
      expect(result.localIncomeTax).toBe(10_543);
      expect(result.totalTax).toBe(105_430 + 10_543);
    });
  });

  describe('fallback to lower dependents', () => {
    it('should fallback to highest available dependents when exact match not found', () => {
      // 5 dependents at 3M-3.5M range: no exact match
      // Fallback to highest dependents <= 5 → 4 dependents (81,050)
      const result = TaxCalculator.calculate(3_000_000, 5, TAX_BRACKETS);

      expect(result.incomeTax).toBe(81_050);
    });

    it('should fallback gracefully when only lower dependents available', () => {
      // 4 dependents at 2.5M-3M range: no 4-dep entry
      // Fallback to highest <= 4 → 3 dependents (70,230)
      const result = TaxCalculator.calculate(2_500_000, 4, TAX_BRACKETS);

      expect(result.incomeTax).toBe(70_230);
    });
  });

  describe('no matching bracket', () => {
    it('should return 0 when no bracket matches at all', () => {
      const result = TaxCalculator.calculate(10_000_000, 1, TAX_BRACKETS);

      // 10M is above all our sample brackets (max is 5M for 1 dep)
      expect(result.incomeTax).toBe(0);
    });

    it('should return 0 for empty brackets', () => {
      const result = TaxCalculator.calculate(3_000_000, 1, []);

      expect(result.incomeTax).toBe(0);
    });
  });

  describe('boundary values', () => {
    it('should match bracket at exact minIncome (inclusive)', () => {
      const result = TaxCalculator.calculate(2_500_000, 1, TAX_BRACKETS);

      // 2,500,000 >= 2,500,000 && < 3,000,000 → 105,430
      expect(result.incomeTax).toBe(105_430);
    });

    it('should not match bracket at exact maxIncome (exclusive)', () => {
      const result = TaxCalculator.calculate(3_000_000, 1, TAX_BRACKETS);

      // 3,000,000 >= 3,000,000 && < 3,500,000 → 155,940 (next bracket)
      expect(result.incomeTax).toBe(155_940);
    });
  });
});
