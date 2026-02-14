import { describe, it, expect } from 'vitest';
import { GrossPayCalculator } from '../GrossPayCalculator';
import type { SalaryItemProps } from '../../entities/SalaryItem';
import type { AttendanceSummary } from '../../entities/AttendanceRecord';

const ZERO_ATTENDANCE: AttendanceSummary = {
  regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0,
  nightOvertimeMinutes: 0, holidayMinutes: 0, holidayOvertimeMinutes: 0,
  holidayNightMinutes: 0, holidayNightOvertimeMinutes: 0,
};

const BASE_SALARY: SalaryItemProps = {
  id: '1', code: 'B01', name: '기본급', type: 'BASE',
  paymentType: 'FIXED', paymentCycle: 'MONTHLY',
  amount: 3_000_000, isOrdinaryWage: true, isTaxExempt: false,
};

const FIXED_ALLOWANCE: SalaryItemProps = {
  id: '2', code: 'A01', name: '직책수당', type: 'ALLOWANCE',
  paymentType: 'FIXED', paymentCycle: 'MONTHLY',
  amount: 200_000, isOrdinaryWage: true, isTaxExempt: false,
};

const VARIABLE_ALLOWANCE: SalaryItemProps = {
  id: '3', code: 'A08', name: '성과수당', type: 'ALLOWANCE',
  paymentType: 'VARIABLE', paymentCycle: 'MONTHLY',
  amount: 500_000, isOrdinaryWage: false, isTaxExempt: false,
};

const DEDUCTION_ITEM: SalaryItemProps = {
  id: '4', code: 'D10', name: '결근공제', type: 'DEDUCTION',
  paymentType: 'FIXED', paymentCycle: 'MONTHLY',
  amount: 100_000, isOrdinaryWage: false, isTaxExempt: false,
};

describe('GrossPayCalculator', () => {
  describe('full month (no proration)', () => {
    it('should calculate basic salary with no overtime', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, FIXED_ALLOWANCE];
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 15_311, 1.0);

      expect(result.basePay).toBe(3_000_000);
      expect(result.fixedAllowances).toBe(200_000);
      expect(result.overtimePay).toBe(0);
      expect(result.variableAllowances).toBe(0);
      expect(result.attendanceDeductions).toBe(0);
      expect(result.totalPay).toBe(3_200_000);
    });

    it('should include premium pay from attendance', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        overtimeMinutes: 600, // 10 hours overtime
      };
      const hourlyWage = Math.floor(3_000_000 / 209); // 14354
      const result = GrossPayCalculator.calculate(items, attendance, hourlyWage, 1.0);

      const expectedOT = Math.floor(hourlyWage * 1.5 * 600 / 60);
      expect(result.overtimePay).toBe(expectedOT);
      expect(result.totalPay).toBe(3_000_000 + expectedOT);
    });

    it('should include variable allowances (not prorated)', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, VARIABLE_ALLOWANCE];
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, 1.0);

      expect(result.variableAllowances).toBe(500_000);
      expect(result.totalPay).toBe(3_500_000);
    });

    it('should subtract deductions', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, DEDUCTION_ITEM];
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, 1.0);

      expect(result.attendanceDeductions).toBe(100_000);
      expect(result.totalPay).toBe(2_900_000);
    });
  });

  describe('proration', () => {
    it('should prorate base pay and fixed allowances', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, FIXED_ALLOWANCE];
      const prorationRatio = 16 / 31; // Mid-month join (16 days out of 31)
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, prorationRatio);

      expect(result.basePay).toBe(Math.floor(3_000_000 * prorationRatio));
      expect(result.fixedAllowances).toBe(Math.floor(200_000 * prorationRatio));
    });

    it('should NOT prorate variable allowances', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, VARIABLE_ALLOWANCE];
      const prorationRatio = 0.5;
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, prorationRatio);

      // Variable allowances are NOT prorated
      expect(result.variableAllowances).toBe(500_000);
      // Base is prorated
      expect(result.basePay).toBe(Math.floor(3_000_000 * 0.5));
    });

    it('should floor prorated amounts', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const prorationRatio = 16 / 31; // ~0.516129
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, prorationRatio);

      expect(Number.isInteger(result.basePay)).toBe(true);
      expect(result.basePay).toBe(Math.floor(3_000_000 * prorationRatio));
    });
  });

  describe('combined scenario', () => {
    it('should correctly combine all components', () => {
      const items: SalaryItemProps[] = [
        BASE_SALARY, FIXED_ALLOWANCE, VARIABLE_ALLOWANCE, DEDUCTION_ITEM,
      ];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        overtimeMinutes: 120,
        nightMinutes: 60,
      };
      const hourlyWage = 14_354;
      const result = GrossPayCalculator.calculate(items, attendance, hourlyWage, 1.0);

      const expectedOT = Math.floor(hourlyWage * 1.5 * 120 / 60);
      const expectedNight = Math.floor(hourlyWage * 0.5 * 60 / 60);

      expect(result.totalPay).toBe(
        3_000_000 +   // base
        200_000 +     // fixed allowance
        expectedOT +  // overtime
        expectedNight + // night
        500_000 -     // variable allowance
        100_000       // deduction
      );
    });
  });

  describe('hourly salary type', () => {
    it('should calculate basePay from hourlyRate × regularMinutes / 60', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 9600, // 160 hours
      };
      const items: SalaryItemProps[] = [BASE_SALARY]; // BASE item is ignored for HOURLY
      const hourlyRate = 11_000;
      const result = GrossPayCalculator.calculate(items, attendance, hourlyRate, 1.0, 'HOURLY', hourlyRate);

      // basePay = floor(11000 × 9600 / 60) = floor(1,760,000) = 1,760,000
      expect(result.basePay).toBe(Math.floor(11_000 * 9600 / 60));
      // fixedAllowances still comes from items
      expect(result.fixedAllowances).toBe(0); // BASE_SALARY is BASE type, not ALLOWANCE
    });

    it('should include overtime premium for hourly employees', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 9600,
        overtimeMinutes: 300, // 5 hours OT
      };
      const hourlyRate = 10_320;
      const result = GrossPayCalculator.calculate([], attendance, hourlyRate, 1.0, 'HOURLY', hourlyRate);

      const expectedBase = Math.floor(10_320 * 9600 / 60);
      const expectedOT = Math.floor(hourlyRate * 1.5 * 300 / 60);
      expect(result.basePay).toBe(expectedBase);
      expect(result.overtimePay).toBe(expectedOT);
      expect(result.totalPay).toBe(expectedBase + expectedOT);
    });

    it('should handle zero regularMinutes for hourly employee', () => {
      const attendance: AttendanceSummary = { ...ZERO_ATTENDANCE, regularMinutes: 0 };
      const result = GrossPayCalculator.calculate([], attendance, 11_000, 1.0, 'HOURLY', 11_000);

      expect(result.basePay).toBe(0);
      expect(result.totalPay).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty salary items', () => {
      const result = GrossPayCalculator.calculate([], ZERO_ATTENDANCE, 14_354, 1.0);

      expect(result.totalPay).toBe(0);
    });

    it('should handle zero proration ratio', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, FIXED_ALLOWANCE];
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, 0);

      expect(result.basePay).toBe(0);
      expect(result.fixedAllowances).toBe(0);
    });
  });
});
