import { describe, it, expect } from 'vitest';
import {
  calculateServiceMonths,
  findMatchingTier,
  calculateProRata,
  calculateLegalAnnualLeave,
} from '../LeaveAccrualCalculator';
import type { AccrualTier } from '../LeaveAccrualCalculator';

describe('LeaveAccrualCalculator', () => {
  describe('calculateServiceMonths', () => {
    it('should return 0 for same date', () => {
      const date = new Date(2025, 0, 1);
      expect(calculateServiceMonths(date, date)).toBe(0);
    });

    it('should return 1 for one month later', () => {
      expect(calculateServiceMonths(new Date(2025, 0, 1), new Date(2025, 1, 1))).toBe(1);
    });

    it('should return 11 for eleven months later', () => {
      expect(calculateServiceMonths(new Date(2025, 0, 1), new Date(2025, 11, 1))).toBe(11);
    });

    it('should return 12 for exactly one year', () => {
      expect(calculateServiceMonths(new Date(2025, 0, 1), new Date(2026, 0, 1))).toBe(12);
    });

    it('should return 41 for 3 years and 5 months', () => {
      expect(calculateServiceMonths(new Date(2022, 0, 15), new Date(2025, 5, 15))).toBe(41);
    });

    it('should return 0 when referenceDate is before joinDate', () => {
      expect(calculateServiceMonths(new Date(2025, 5, 1), new Date(2025, 0, 1))).toBe(0);
    });

    it('should not count partial month when day has not been reached', () => {
      // 1월 15일 입사, 2월 14일 기준 → 0개월 (15일에 도달하지 않음)
      expect(calculateServiceMonths(new Date(2025, 0, 15), new Date(2025, 1, 14))).toBe(0);
    });

    it('should count full month when day is reached', () => {
      // 1월 15일 입사, 2월 15일 기준 → 1개월
      expect(calculateServiceMonths(new Date(2025, 0, 15), new Date(2025, 1, 15))).toBe(1);
    });
  });

  describe('findMatchingTier', () => {
    // 1년 미만 월별 tiers: 1~11개월
    const monthlyTiers: AccrualTier[] = Array.from({ length: 11 }, (_, i) => ({
      serviceMonthFrom: i + 1,
      serviceMonthTo: i + 1,
      accrualDays: 1,
      validMonths: 12,
    }));

    it('should match tier for 1 month', () => {
      const tier = findMatchingTier(1, monthlyTiers);
      expect(tier).not.toBeNull();
      expect(tier!.serviceMonthFrom).toBe(1);
      expect(tier!.accrualDays).toBe(1);
    });

    it('should match tier for 11 months', () => {
      const tier = findMatchingTier(11, monthlyTiers);
      expect(tier).not.toBeNull();
      expect(tier!.serviceMonthFrom).toBe(11);
    });

    it('should return null for 0 months (no matching tier)', () => {
      expect(findMatchingTier(0, monthlyTiers)).toBeNull();
    });

    it('should return null for 12 months (out of range)', () => {
      expect(findMatchingTier(12, monthlyTiers)).toBeNull();
    });

    it('should match range tier', () => {
      const rangeTiers: AccrualTier[] = [
        { serviceMonthFrom: 12, serviceMonthTo: 35, accrualDays: 15 },
        { serviceMonthFrom: 36, serviceMonthTo: 59, accrualDays: 16 },
      ];
      expect(findMatchingTier(24, rangeTiers)!.accrualDays).toBe(15);
      expect(findMatchingTier(36, rangeTiers)!.accrualDays).toBe(16);
    });

    it('should return null for empty tiers', () => {
      expect(findMatchingTier(5, [])).toBeNull();
    });
  });

  describe('calculateProRata', () => {
    const fiscalStart = new Date(2025, 0, 1); // 1월 1일
    const fiscalEnd = new Date(2025, 11, 31); // 12월 31일

    it('should return full days when joinDate is at fiscal start', () => {
      const result = calculateProRata(15, new Date(2025, 0, 1), fiscalStart, fiscalEnd);
      expect(result).toBe(15);
    });

    it('should return full days when joinDate is before fiscal start', () => {
      const result = calculateProRata(15, new Date(2024, 6, 1), fiscalStart, fiscalEnd);
      expect(result).toBe(15);
    });

    it('should return approximately half for mid-year join', () => {
      // 7월 1일 입사 → 약 절반
      const result = calculateProRata(15, new Date(2025, 6, 1), fiscalStart, fiscalEnd);
      // 7월 1일~12월 31일 = 183일, 총 364일 → 15 * 183/364 ≈ 7.5
      expect(result).toBeGreaterThanOrEqual(7.4);
      expect(result).toBeLessThanOrEqual(7.6);
    });

    it('should return approximately 1/12 for December join', () => {
      // 12월 1일 입사 → 약 1/12
      const result = calculateProRata(15, new Date(2025, 11, 1), fiscalStart, fiscalEnd);
      // 12월 1일~12월 31일 = 30일, 총 364일 → 15 * 30/364 ≈ 1.2
      expect(result).toBeGreaterThanOrEqual(1.1);
      expect(result).toBeLessThanOrEqual(1.4);
    });

    it('should return 0 when joinDate is at or after fiscal end', () => {
      expect(calculateProRata(15, new Date(2025, 11, 31), fiscalStart, fiscalEnd)).toBe(0);
      expect(calculateProRata(15, new Date(2026, 0, 1), fiscalStart, fiscalEnd)).toBe(0);
    });

    it('should return 0 when fiscal period is invalid', () => {
      expect(calculateProRata(15, new Date(2025, 0, 1), fiscalEnd, fiscalStart)).toBe(0);
    });

    it('should round to one decimal place', () => {
      // 결과가 소수점 첫째자리까지인지 확인
      const result = calculateProRata(15, new Date(2025, 3, 15), fiscalStart, fiscalEnd);
      const decimalPlaces = (result.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateLegalAnnualLeave', () => {
    it('should return 0 for less than 1 year (monthly accrual applies)', () => {
      expect(calculateLegalAnnualLeave(0)).toBe(0);
    });

    it('should return 15 for 1 year', () => {
      expect(calculateLegalAnnualLeave(1)).toBe(15);
    });

    it('should return 15 for 2 years', () => {
      expect(calculateLegalAnnualLeave(2)).toBe(15);
    });

    it('should return 16 for 3 years', () => {
      expect(calculateLegalAnnualLeave(3)).toBe(16);
    });

    it('should return 16 for 4 years', () => {
      expect(calculateLegalAnnualLeave(4)).toBe(16);
    });

    it('should return 17 for 5 years', () => {
      expect(calculateLegalAnnualLeave(5)).toBe(17);
    });

    it('should return 25 for 21 years', () => {
      expect(calculateLegalAnnualLeave(21)).toBe(25);
    });

    it('should cap at 25 for 30 years', () => {
      expect(calculateLegalAnnualLeave(30)).toBe(25);
    });

    it('should follow the 2-year increment pattern', () => {
      // 1y=15, 3y=16, 5y=17, 7y=18, 9y=19, 11y=20, 13y=21, 15y=22, 17y=23, 19y=24, 21y=25
      const expected = [
        [1, 15], [2, 15], [3, 16], [4, 16], [5, 17], [6, 17],
        [7, 18], [8, 18], [9, 19], [10, 19], [11, 20], [12, 20],
        [13, 21], [14, 21], [15, 22], [16, 22], [17, 23], [18, 23],
        [19, 24], [20, 24], [21, 25], [22, 25], [23, 25], [24, 25],
      ];
      for (const [years, days] of expected) {
        expect(calculateLegalAnnualLeave(years)).toBe(days);
      }
    });
  });
});
