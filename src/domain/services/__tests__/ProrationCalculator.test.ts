import { describe, it, expect } from 'vitest';
import { ProrationCalculator } from '../ProrationCalculator';

describe('ProrationCalculator', () => {
  describe('full month (no proration)', () => {
    it('should return ratio 1.0 when employee works full month', () => {
      const joinDate = new Date(2024, 0, 1); // Jan 1, 2024 (before the month)
      const result = ProrationCalculator.calculate(2025, 3, joinDate);

      expect(result.ratio).toBe(1.0);
      expect(result.applied).toBe(false);
      expect(result.workedDays).toBe(31); // March has 31 days
      expect(result.totalDays).toBe(31);
    });

    it('should not prorate when join date is exactly the 1st of the month', () => {
      const joinDate = new Date(2025, 2, 1); // Mar 1, 2025
      const result = ProrationCalculator.calculate(2025, 3, joinDate);

      expect(result.ratio).toBe(1.0);
      expect(result.applied).toBe(false);
    });

    it('should not prorate when resign date is after month end', () => {
      const joinDate = new Date(2024, 0, 1);
      const resignDate = new Date(2025, 3, 15); // April 15, 2025 (after March)
      const result = ProrationCalculator.calculate(2025, 3, joinDate, resignDate);

      expect(result.ratio).toBe(1.0);
      expect(result.applied).toBe(false);
    });
  });

  describe('calendar day proration (CALENDAR_DAY)', () => {
    it('should prorate for mid-month join', () => {
      const joinDate = new Date(2025, 2, 16); // Mar 16, 2025
      const result = ProrationCalculator.calculate(2025, 3, joinDate, undefined, 'CALENDAR_DAY');

      // March has 31 days, worked from 16th to 31st = 16 days
      expect(result.applied).toBe(true);
      expect(result.workedDays).toBe(16);
      expect(result.totalDays).toBe(31);
      expect(result.ratio).toBeCloseTo(16 / 31, 10);
    });

    it('should prorate for mid-month resignation', () => {
      const joinDate = new Date(2024, 0, 1); // Before the month
      const resignDate = new Date(2025, 2, 15); // Mar 15, 2025
      const result = ProrationCalculator.calculate(2025, 3, joinDate, resignDate, 'CALENDAR_DAY');

      // Worked from 1st to 15th = 15 days
      expect(result.applied).toBe(true);
      expect(result.workedDays).toBe(15);
      expect(result.totalDays).toBe(31);
      expect(result.ratio).toBeCloseTo(15 / 31, 10);
    });

    it('should prorate for both mid-month join and resignation in same month', () => {
      const joinDate = new Date(2025, 2, 10); // Mar 10
      const resignDate = new Date(2025, 2, 20); // Mar 20
      const result = ProrationCalculator.calculate(2025, 3, joinDate, resignDate, 'CALENDAR_DAY');

      // Worked from 10th to 20th = 11 days
      expect(result.applied).toBe(true);
      expect(result.workedDays).toBe(11);
      expect(result.totalDays).toBe(31);
    });

    it('should handle February correctly (28 days)', () => {
      const joinDate = new Date(2025, 1, 15); // Feb 15, 2025
      const result = ProrationCalculator.calculate(2025, 2, joinDate);

      // February 2025 has 28 days, worked 15th-28th = 14 days
      expect(result.workedDays).toBe(14);
      expect(result.totalDays).toBe(28);
    });

    it('should handle leap year February (29 days)', () => {
      const joinDate = new Date(2024, 1, 15); // Feb 15, 2024 (leap year)
      const result = ProrationCalculator.calculate(2024, 2, joinDate);

      // February 2024 has 29 days, worked 15th-29th = 15 days
      expect(result.workedDays).toBe(15);
      expect(result.totalDays).toBe(29);
    });
  });

  describe('working day proration (WORKING_DAY)', () => {
    it('should count only Mon-Fri as working days', () => {
      // March 2025: starts on Saturday (Mar 1 = Sat)
      // Working days in March 2025: Mon-Fri = 21 days
      const joinDate = new Date(2024, 0, 1); // Full month
      const resignDate = new Date(2025, 2, 14); // Mar 14, 2025 (Friday)
      const result = ProrationCalculator.calculate(2025, 3, joinDate, resignDate, 'WORKING_DAY');

      expect(result.applied).toBe(true);
      // Mar 1 (Sat), 2 (Sun), 3 (Mon)...14 (Fri) → working days: 3,4,5,6,7,10,11,12,13,14 = 10
      expect(result.workedDays).toBe(10);
      // Total working days in March 2025: 21
      expect(result.totalDays).toBe(21);
    });

    it('should exclude holidays from working days', () => {
      const joinDate = new Date(2024, 0, 1);
      const resignDate = new Date(2025, 2, 14);
      const holidays = [new Date(2025, 2, 3)]; // Mar 3 is a holiday (Monday)
      const result = ProrationCalculator.calculate(
        2025, 3, joinDate, resignDate, 'WORKING_DAY', holidays,
      );

      expect(result.applied).toBe(true);
      // Previous: 10 working days, minus 1 holiday = 9
      expect(result.workedDays).toBe(9);
      // Total: 21 - 1 = 20
      expect(result.totalDays).toBe(20);
    });
  });

  describe('edge cases', () => {
    it('should handle join on last day of month', () => {
      const joinDate = new Date(2025, 2, 31); // Mar 31
      const result = ProrationCalculator.calculate(2025, 3, joinDate);

      expect(result.applied).toBe(true);
      expect(result.workedDays).toBe(1);
      expect(result.totalDays).toBe(31);
    });

    it('should handle resignation on first day of month', () => {
      const joinDate = new Date(2024, 0, 1);
      const resignDate = new Date(2025, 2, 1); // Mar 1
      const result = ProrationCalculator.calculate(2025, 3, joinDate, resignDate);

      expect(result.applied).toBe(true);
      expect(result.workedDays).toBe(1);
    });

    it('should default to CALENDAR_DAY method', () => {
      const joinDate = new Date(2025, 2, 16); // Mar 16
      const result = ProrationCalculator.calculate(2025, 3, joinDate);

      expect(result.applied).toBe(true);
      expect(result.workedDays).toBe(16); // Calendar days, not working days
    });
  });
});
