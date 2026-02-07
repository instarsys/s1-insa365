import { describe, it, expect } from 'vitest';
import { TaxExemptSeparator } from '../TaxExemptSeparator';
import type { SalaryItemProps } from '../../entities/SalaryItem';
import type { TaxExemptLimitEntry } from '../types';

const BASE_ITEM: SalaryItemProps = {
  id: '1', code: 'B01', name: '기본급', type: 'BASE',
  paymentType: 'FIXED', paymentCycle: 'MONTHLY',
  amount: 3_000_000, isOrdinaryWage: true, isTaxExempt: false,
};

const LIMITS_2025: TaxExemptLimitEntry[] = [
  { code: 'MEALS', name: '식대', monthlyLimit: 200_000 },
  { code: 'VEHICLE', name: '자가운전보조금', monthlyLimit: 200_000 },
  { code: 'CHILDCARE', name: '보육수당', monthlyLimit: 200_000 },
];

describe('TaxExemptSeparator', () => {
  describe('basic tax-exempt separation', () => {
    it('should separate meals allowance within limit', () => {
      const items: SalaryItemProps[] = [
        BASE_ITEM,
        {
          id: '2', code: 'A03', name: '식대', type: 'ALLOWANCE',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 200_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'MEALS',
        },
      ];
      const result = TaxExemptSeparator.calculate(items, 3_200_000, LIMITS_2025);

      expect(result.totalNonTaxable).toBe(200_000);
      expect(result.taxableIncome).toBe(3_000_000);
      expect(result.nonTaxableItems).toHaveLength(1);
      expect(result.nonTaxableItems[0].applied).toBe(200_000);
    });

    it('should cap at monthly limit when amount exceeds limit', () => {
      const items: SalaryItemProps[] = [
        BASE_ITEM,
        {
          id: '2', code: 'A03', name: '식대', type: 'ALLOWANCE',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 300_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'MEALS',
        },
      ];
      const result = TaxExemptSeparator.calculate(items, 3_300_000, LIMITS_2025);

      // Only 200,000 is tax exempt (limit), remaining 100,000 is taxable
      expect(result.totalNonTaxable).toBe(200_000);
      expect(result.taxableIncome).toBe(3_100_000);
      expect(result.nonTaxableItems[0].amount).toBe(300_000);
      expect(result.nonTaxableItems[0].limit).toBe(200_000);
      expect(result.nonTaxableItems[0].applied).toBe(200_000);
    });

    it('should handle multiple tax-exempt items', () => {
      const items: SalaryItemProps[] = [
        BASE_ITEM,
        {
          id: '2', code: 'A03', name: '식대', type: 'ALLOWANCE',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 200_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'MEALS',
        },
        {
          id: '3', code: 'A04', name: '자가운전보조금', type: 'ALLOWANCE',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 200_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'VEHICLE',
        },
        {
          id: '4', code: 'A05', name: '보육수당', type: 'ALLOWANCE',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 100_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'CHILDCARE',
        },
      ];
      const totalPay = 3_500_000;
      const result = TaxExemptSeparator.calculate(items, totalPay, LIMITS_2025);

      // 200,000 + 200,000 + 100,000 = 500,000 non-taxable
      expect(result.totalNonTaxable).toBe(500_000);
      expect(result.taxableIncome).toBe(3_000_000);
      expect(result.nonTaxableItems).toHaveLength(3);
    });
  });

  describe('no tax-exempt items', () => {
    it('should return zero non-taxable when no items are tax-exempt', () => {
      const items: SalaryItemProps[] = [BASE_ITEM];
      const result = TaxExemptSeparator.calculate(items, 3_000_000, LIMITS_2025);

      expect(result.totalNonTaxable).toBe(0);
      expect(result.taxableIncome).toBe(3_000_000);
      expect(result.nonTaxableItems).toHaveLength(0);
    });
  });

  describe('deduction items excluded', () => {
    it('should not treat deduction items as tax-exempt even if flagged', () => {
      const items: SalaryItemProps[] = [
        BASE_ITEM,
        {
          id: '2', code: 'D07', name: '공제항목', type: 'DEDUCTION',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 50_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'MEALS',
        },
      ];
      const result = TaxExemptSeparator.calculate(items, 3_000_000, LIMITS_2025);

      expect(result.totalNonTaxable).toBe(0);
    });
  });

  describe('tax-exempt with no matching limit', () => {
    it('should use full amount when no limit code match (fully tax-exempt)', () => {
      const items: SalaryItemProps[] = [
        BASE_ITEM,
        {
          id: '2', code: 'A10', name: '특수수당', type: 'ALLOWANCE',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 150_000, isOrdinaryWage: false, isTaxExempt: true,
          // no taxExemptCode → no limit found → full amount is non-taxable
        },
      ];
      const result = TaxExemptSeparator.calculate(items, 3_150_000, LIMITS_2025);

      expect(result.totalNonTaxable).toBe(150_000);
      expect(result.taxableIncome).toBe(3_000_000);
    });
  });

  describe('item details', () => {
    it('should include correct details for each non-taxable item', () => {
      const items: SalaryItemProps[] = [
        BASE_ITEM,
        {
          id: '2', code: 'A03', name: '식대', type: 'ALLOWANCE',
          paymentType: 'FIXED', paymentCycle: 'MONTHLY',
          amount: 250_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'MEALS',
        },
      ];
      const result = TaxExemptSeparator.calculate(items, 3_250_000, LIMITS_2025);

      expect(result.nonTaxableItems[0]).toEqual({
        code: 'A03',
        name: '식대',
        amount: 250_000,
        limit: 200_000,
        applied: 200_000,
      });
    });
  });
});
