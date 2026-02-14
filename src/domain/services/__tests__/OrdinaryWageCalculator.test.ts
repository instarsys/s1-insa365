import { describe, it, expect } from 'vitest';
import { OrdinaryWageCalculator } from '../OrdinaryWageCalculator';
import type { SalaryItemProps } from '../../entities/SalaryItem';

function makeItem(overrides: Partial<SalaryItemProps> = {}): SalaryItemProps {
  return {
    id: '1',
    code: 'A01',
    name: '기본급',
    type: 'BASE',
    paymentType: 'FIXED',
    paymentCycle: 'MONTHLY',
    amount: 3_000_000,
    isOrdinaryWage: true,
    isTaxExempt: false,
    ...overrides,
  };
}

describe('OrdinaryWageCalculator', () => {
  describe('basic calculation', () => {
    it('should calculate ordinary wage from base salary only', () => {
      const items: SalaryItemProps[] = [makeItem()];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      expect(result.monthlyOrdinaryWage).toBe(3_000_000);
      expect(result.hourlyOrdinaryWage).toBe(Math.floor(3_000_000 / 209)); // 14354
      expect(result.items).toHaveLength(1);
    });

    it('should include ordinary wage allowances', () => {
      const items: SalaryItemProps[] = [
        makeItem(),
        makeItem({
          id: '2', code: 'A02', name: '직책수당', type: 'ALLOWANCE',
          amount: 200_000, isOrdinaryWage: true,
        }),
      ];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      expect(result.monthlyOrdinaryWage).toBe(3_200_000);
      expect(result.hourlyOrdinaryWage).toBe(Math.floor(3_200_000 / 209)); // 15311
      expect(result.items).toHaveLength(2);
    });

    it('should exclude non-ordinary wage allowances', () => {
      const items: SalaryItemProps[] = [
        makeItem(),
        makeItem({
          id: '2', code: 'A03', name: '식대', type: 'ALLOWANCE',
          amount: 200_000, isOrdinaryWage: false,
        }),
      ];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      expect(result.monthlyOrdinaryWage).toBe(3_000_000);
      expect(result.items).toHaveLength(1);
    });

    it('should exclude deduction items even if marked as ordinary wage', () => {
      const items: SalaryItemProps[] = [
        makeItem(),
        makeItem({
          id: '2', code: 'D01', name: '국민연금', type: 'DEDUCTION',
          amount: 135_000, isOrdinaryWage: true,
        }),
      ];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      expect(result.monthlyOrdinaryWage).toBe(3_000_000);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('payment cycle conversion', () => {
    it('should convert bimonthly to monthly (divide by 2, floored)', () => {
      const items: SalaryItemProps[] = [
        makeItem(),
        makeItem({
          id: '2', code: 'A04', name: '격월상여', type: 'ALLOWANCE',
          paymentCycle: 'BIMONTHLY', amount: 500_000, isOrdinaryWage: true,
        }),
      ];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      // 3,000,000 + floor(500,000/2) = 3,250,000
      expect(result.monthlyOrdinaryWage).toBe(3_250_000);
    });

    it('should convert quarterly to monthly (divide by 3, floored)', () => {
      const items: SalaryItemProps[] = [
        makeItem(),
        makeItem({
          id: '2', code: 'A05', name: '분기상여', type: 'ALLOWANCE',
          paymentCycle: 'QUARTERLY', amount: 900_000, isOrdinaryWage: true,
        }),
      ];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      // 3,000,000 + floor(900,000/3) = 3,300,000
      expect(result.monthlyOrdinaryWage).toBe(3_300_000);
    });

    it('should convert annual to monthly (divide by 12, floored)', () => {
      const items: SalaryItemProps[] = [
        makeItem(),
        makeItem({
          id: '2', code: 'A06', name: '연말상여', type: 'ALLOWANCE',
          paymentCycle: 'ANNUAL', amount: 3_600_000, isOrdinaryWage: true,
        }),
      ];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      // 3,000,000 + floor(3,600,000/12) = 3,300,000
      expect(result.monthlyOrdinaryWage).toBe(3_300_000);
    });

    it('should floor non-divisible annual amounts', () => {
      const items: SalaryItemProps[] = [
        makeItem({
          paymentCycle: 'ANNUAL', amount: 1_000_000, isOrdinaryWage: true,
        }),
      ];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      // floor(1,000,000/12) = 83333
      expect(result.monthlyOrdinaryWage).toBe(83_333);
    });
  });

  describe('hourly wage calculation', () => {
    it('should floor the hourly wage', () => {
      const items: SalaryItemProps[] = [makeItem({ amount: 2_500_000 })];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      // floor(2,500,000 / 209) = floor(11961.72...) = 11961
      expect(result.hourlyOrdinaryWage).toBe(11_961);
    });

    it('should return 0 hourly wage when monthlyWorkHours is 0', () => {
      const items: SalaryItemProps[] = [makeItem()];
      const result = OrdinaryWageCalculator.calculate(items, 0);

      expect(result.hourlyOrdinaryWage).toBe(0);
    });

    it('should use default 209 hours when not specified', () => {
      const items: SalaryItemProps[] = [makeItem({ amount: 2_090_000 })];
      const result = OrdinaryWageCalculator.calculate(items);

      expect(result.hourlyOrdinaryWage).toBe(10_000);
    });
  });

  describe('empty / edge cases', () => {
    it('should return zeros for empty salary items', () => {
      const result = OrdinaryWageCalculator.calculate([], 209);

      expect(result.monthlyOrdinaryWage).toBe(0);
      expect(result.hourlyOrdinaryWage).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should return zeros when all items are non-ordinary wage', () => {
      const items: SalaryItemProps[] = [
        makeItem({ isOrdinaryWage: false }),
        makeItem({ id: '2', code: 'A02', type: 'ALLOWANCE', amount: 200_000, isOrdinaryWage: false }),
      ];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      expect(result.monthlyOrdinaryWage).toBe(0);
      expect(result.hourlyOrdinaryWage).toBe(0);
    });
  });

  describe('hourly salary type', () => {
    it('should use hourlyRate directly as ordinaryHourlyWage', () => {
      const items: SalaryItemProps[] = [makeItem()]; // items are ignored for HOURLY
      const result = OrdinaryWageCalculator.calculate(items, 209, 'HOURLY', 11_000);

      expect(result.hourlyOrdinaryWage).toBe(11_000);
      expect(result.monthlyOrdinaryWage).toBe(Math.floor(11_000 * 209)); // 2,299,000
      expect(result.items).toHaveLength(1);
      expect(result.items[0].code).toBe('HOURLY');
      expect(result.items[0].name).toBe('시급');
    });

    it('should calculate monthly from hourlyRate × monthlyWorkHours', () => {
      const result = OrdinaryWageCalculator.calculate([], 209, 'HOURLY', 10_320);

      // 10320 * 209 = 2,156,880
      expect(result.monthlyOrdinaryWage).toBe(2_156_880);
      expect(result.hourlyOrdinaryWage).toBe(10_320);
    });

    it('should fall back to MONTHLY logic if hourlyRate is undefined', () => {
      const items: SalaryItemProps[] = [makeItem({ amount: 2_090_000 })];
      const result = OrdinaryWageCalculator.calculate(items, 209, 'HOURLY', undefined);

      // Falls back to item-based calculation
      expect(result.monthlyOrdinaryWage).toBe(2_090_000);
      expect(result.hourlyOrdinaryWage).toBe(10_000);
    });
  });

  describe('item details in result', () => {
    it('should include correct item details with monthly amounts', () => {
      const items: SalaryItemProps[] = [
        makeItem({ code: 'B01', name: '기본급', amount: 3_000_000 }),
        makeItem({
          id: '2', code: 'A07', name: '연간상여', type: 'ALLOWANCE',
          paymentCycle: 'ANNUAL', amount: 1_200_000, isOrdinaryWage: true,
        }),
      ];
      const result = OrdinaryWageCalculator.calculate(items, 209);

      expect(result.items).toEqual([
        { code: 'B01', name: '기본급', monthlyAmount: 3_000_000 },
        { code: 'A07', name: '연간상여', monthlyAmount: 100_000 },
      ]);
    });
  });
});
