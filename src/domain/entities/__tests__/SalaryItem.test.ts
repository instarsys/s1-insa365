import { describe, it, expect } from 'vitest';
import { SalaryItem, type SalaryItemProps } from '../SalaryItem';

function makeProps(overrides: Partial<SalaryItemProps> = {}): SalaryItemProps {
  return {
    id: '1',
    code: 'B01',
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

describe('SalaryItem', () => {
  describe('toMonthlyAmount', () => {
    it('should return same amount for MONTHLY cycle', () => {
      const item = new SalaryItem(makeProps({ paymentCycle: 'MONTHLY', amount: 200_000 }));
      expect(item.toMonthlyAmount()).toBe(200_000);
    });

    it('should divide by 2 for BIMONTHLY cycle', () => {
      const item = new SalaryItem(makeProps({ paymentCycle: 'BIMONTHLY', amount: 500_000 }));
      expect(item.toMonthlyAmount()).toBe(250_000);
    });

    it('should floor BIMONTHLY for odd amounts', () => {
      const item = new SalaryItem(makeProps({ paymentCycle: 'BIMONTHLY', amount: 333_333 }));
      expect(item.toMonthlyAmount()).toBe(Math.floor(333_333 / 2)); // 166666
    });

    it('should divide by 3 for QUARTERLY cycle', () => {
      const item = new SalaryItem(makeProps({ paymentCycle: 'QUARTERLY', amount: 900_000 }));
      expect(item.toMonthlyAmount()).toBe(300_000);
    });

    it('should floor QUARTERLY for non-divisible amounts', () => {
      const item = new SalaryItem(makeProps({ paymentCycle: 'QUARTERLY', amount: 1_000_000 }));
      expect(item.toMonthlyAmount()).toBe(Math.floor(1_000_000 / 3)); // 333333
    });

    it('should divide by 12 for ANNUAL cycle', () => {
      const item = new SalaryItem(makeProps({ paymentCycle: 'ANNUAL', amount: 3_600_000 }));
      expect(item.toMonthlyAmount()).toBe(300_000);
    });

    it('should floor ANNUAL for non-divisible amounts', () => {
      const item = new SalaryItem(makeProps({ paymentCycle: 'ANNUAL', amount: 1_000_000 }));
      expect(item.toMonthlyAmount()).toBe(Math.floor(1_000_000 / 12)); // 83333
    });
  });

  describe('type checks', () => {
    it('should identify BASE type', () => {
      const item = new SalaryItem(makeProps({ type: 'BASE' }));
      expect(item.isBase()).toBe(true);
      expect(item.isAllowance()).toBe(false);
      expect(item.isDeduction()).toBe(false);
    });

    it('should identify ALLOWANCE type', () => {
      const item = new SalaryItem(makeProps({ type: 'ALLOWANCE' }));
      expect(item.isAllowance()).toBe(true);
    });

    it('should identify DEDUCTION type', () => {
      const item = new SalaryItem(makeProps({ type: 'DEDUCTION' }));
      expect(item.isDeduction()).toBe(true);
    });
  });

  describe('payment type checks', () => {
    it('should identify FIXED payment type', () => {
      const item = new SalaryItem(makeProps({ paymentType: 'FIXED' }));
      expect(item.isFixed()).toBe(true);
      expect(item.isVariable()).toBe(false);
      expect(item.isFormula()).toBe(false);
    });

    it('should identify VARIABLE payment type', () => {
      const item = new SalaryItem(makeProps({ paymentType: 'VARIABLE' }));
      expect(item.isVariable()).toBe(true);
    });

    it('should identify FORMULA payment type', () => {
      const item = new SalaryItem(makeProps({ paymentType: 'FORMULA' }));
      expect(item.isFormula()).toBe(true);
    });
  });

  describe('construction', () => {
    it('should assign all properties correctly', () => {
      const item = new SalaryItem(makeProps({
        id: 'test-id',
        code: 'A03',
        name: '식대',
        type: 'ALLOWANCE',
        amount: 200_000,
        isTaxExempt: true,
        taxExemptCode: 'MEALS',
      }));

      expect(item.id).toBe('test-id');
      expect(item.code).toBe('A03');
      expect(item.name).toBe('식대');
      expect(item.type).toBe('ALLOWANCE');
      expect(item.amount).toBe(200_000);
      expect(item.isTaxExempt).toBe(true);
      expect(item.taxExemptCode).toBe('MEALS');
    });
  });
});
