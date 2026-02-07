import { describe, it, expect } from 'vitest';
import { PremiumCalculator } from '../PremiumCalculator';
import type { AttendanceSummary } from '../../entities/AttendanceRecord';

const ZERO_ATTENDANCE: AttendanceSummary = {
  regularMinutes: 0,
  overtimeMinutes: 0,
  nightMinutes: 0,
  nightOvertimeMinutes: 0,
  holidayMinutes: 0,
  holidayOvertimeMinutes: 0,
  holidayNightMinutes: 0,
  holidayNightOvertimeMinutes: 0,
};

describe('PremiumCalculator', () => {
  // Example: base 3,000,000 / 209 = floor(14354.06...) = 14354
  const hourlyWage = 14_354;

  describe('overtime pay (1.5x)', () => {
    it('should calculate overtime pay correctly', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        overtimeMinutes: 120, // 2 hours
      };
      const result = PremiumCalculator.calculate(hourlyWage, attendance);

      // floor(14354 * 1.5 * 120/60) = floor(14354 * 1.5 * 2) = floor(43062)
      expect(result.overtimePay).toBe(Math.floor(14_354 * 1.5 * 120 / 60));
    });

    it('should handle fractional minutes', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        overtimeMinutes: 90, // 1.5 hours
      };
      const result = PremiumCalculator.calculate(hourlyWage, attendance);

      // floor(14354 * 1.5 * 90/60) = floor(14354 * 1.5 * 1.5) = floor(32296.5)
      expect(result.overtimePay).toBe(Math.floor(14_354 * 1.5 * 90 / 60));
    });
  });

  describe('night pay (0.5x)', () => {
    it('should calculate night pay at 0.5x premium', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        nightMinutes: 180, // 3 hours
      };
      const result = PremiumCalculator.calculate(hourlyWage, attendance);

      expect(result.nightPay).toBe(Math.floor(14_354 * 0.5 * 180 / 60));
    });
  });

  describe('night overtime pay (2.0x)', () => {
    it('should calculate night+overtime at 2.0x', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        nightOvertimeMinutes: 60, // 1 hour
      };
      const result = PremiumCalculator.calculate(hourlyWage, attendance);

      expect(result.nightOvertimePay).toBe(Math.floor(14_354 * 2.0 * 60 / 60));
    });
  });

  describe('holiday pay (1.5x within 8h)', () => {
    it('should calculate holiday pay at 1.5x', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        holidayMinutes: 480, // 8 hours (within 8h)
      };
      const result = PremiumCalculator.calculate(hourlyWage, attendance);

      expect(result.holidayPay).toBe(Math.floor(14_354 * 1.5 * 480 / 60));
    });
  });

  describe('holiday overtime pay (2.0x over 8h)', () => {
    it('should calculate holiday overtime at 2.0x', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        holidayOvertimeMinutes: 120, // 2 hours over 8h
      };
      const result = PremiumCalculator.calculate(hourlyWage, attendance);

      expect(result.holidayOvertimePay).toBe(Math.floor(14_354 * 2.0 * 120 / 60));
    });
  });

  describe('holiday night pay (2.0x within 8h)', () => {
    it('should calculate holiday+night at 2.0x', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        holidayNightMinutes: 120,
      };
      const result = PremiumCalculator.calculate(hourlyWage, attendance);

      expect(result.holidayNightPay).toBe(Math.floor(14_354 * 2.0 * 120 / 60));
    });
  });

  describe('holiday night overtime pay (2.5x over 8h)', () => {
    it('should calculate holiday+night+overtime at 2.5x', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        holidayNightOvertimeMinutes: 60,
      };
      const result = PremiumCalculator.calculate(hourlyWage, attendance);

      expect(result.holidayNightOvertimePay).toBe(Math.floor(14_354 * 2.5 * 60 / 60));
    });
  });

  describe('total premium', () => {
    it('should sum all premiums correctly', () => {
      const attendance: AttendanceSummary = {
        regularMinutes: 9600, // regular is not a premium
        overtimeMinutes: 120,
        nightMinutes: 60,
        nightOvertimeMinutes: 30,
        holidayMinutes: 480,
        holidayOvertimeMinutes: 120,
        holidayNightMinutes: 60,
        holidayNightOvertimeMinutes: 30,
      };
      const result = PremiumCalculator.calculate(hourlyWage, attendance);

      const expected =
        Math.floor(hourlyWage * 1.5 * 120 / 60) +
        Math.floor(hourlyWage * 0.5 * 60 / 60) +
        Math.floor(hourlyWage * 2.0 * 30 / 60) +
        Math.floor(hourlyWage * 1.5 * 480 / 60) +
        Math.floor(hourlyWage * 2.0 * 120 / 60) +
        Math.floor(hourlyWage * 2.0 * 60 / 60) +
        Math.floor(hourlyWage * 2.5 * 30 / 60);

      expect(result.totalPremium).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should return all zeros for zero attendance', () => {
      const result = PremiumCalculator.calculate(hourlyWage, ZERO_ATTENDANCE);

      expect(result.totalPremium).toBe(0);
      expect(result.overtimePay).toBe(0);
      expect(result.nightPay).toBe(0);
    });

    it('should return all zeros for zero hourly wage', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        overtimeMinutes: 120,
        nightMinutes: 60,
      };
      const result = PremiumCalculator.calculate(0, attendance);

      expect(result.totalPremium).toBe(0);
    });

    it('should floor all results (no fractional won)', () => {
      // Use a wage that produces fractional results
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        overtimeMinutes: 37, // non-round minutes
      };
      const result = PremiumCalculator.calculate(14_354, attendance);

      expect(Number.isInteger(result.overtimePay)).toBe(true);
    });
  });
});
