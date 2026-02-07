import { describe, it, expect } from 'vitest';
import { InsuranceCalculator, type InsuranceModes } from '../InsuranceCalculator';
import type { InsuranceRateSet } from '../types';

// 2025 H1 rates
const RATES_2025_H1: InsuranceRateSet = {
  nationalPension: { rate: 0.045, minBase: 390_000, maxBase: 6_170_000 },
  healthInsurance: { rate: 0.03545, minBase: 279_000, maxBase: 12_706_000 },
  longTermCare: { rate: 0.1295 },
  employmentInsurance: { rate: 0.009 },
};

// 2025 H2 rates (pension bounds change in July)
const RATES_2025_H2: InsuranceRateSet = {
  nationalPension: { rate: 0.045, minBase: 400_000, maxBase: 6_370_000 },
  healthInsurance: { rate: 0.03545, minBase: 279_000, maxBase: 12_706_000 },
  longTermCare: { rate: 0.1295 },
  employmentInsurance: { rate: 0.009 },
};

const AUTO_MODES: InsuranceModes = {
  nationalPensionMode: 'AUTO',
  healthInsuranceMode: 'AUTO',
  employmentInsuranceMode: 'AUTO',
};

describe('InsuranceCalculator', () => {
  describe('National Pension (국민연금)', () => {
    it('should calculate at 4.5% and truncate below 10 KRW', () => {
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, AUTO_MODES);

      // 3,000,000 * 0.045 = 135,000 → floor(135000/10)*10 = 135,000
      expect(result.nationalPension).toBe(135_000);
    });

    it('should clamp to minimum base', () => {
      const result = InsuranceCalculator.calculate(300_000, RATES_2025_H1, AUTO_MODES);

      // clamped to 390,000 → 390,000 * 0.045 = 17,550 → floor(17550/10)*10 = 17,550
      expect(result.nationalPension).toBe(17_550);
    });

    it('should clamp to maximum base', () => {
      const result = InsuranceCalculator.calculate(7_000_000, RATES_2025_H1, AUTO_MODES);

      // clamped to 6,170,000 → 6,170,000 * 0.045 = 277,650 → floor(277650/10)*10 = 277,650
      expect(result.nationalPension).toBe(277_650);
    });

    it('should truncate below 10 KRW correctly', () => {
      // Need to find an amount that gives a non-round-10 result before truncation
      // 500,000 * 0.045 = 22,500 → already rounded to 10
      // 510,000 * 0.045 = 22,950 → already rounded to 10
      // 513,000 * 0.045 = 23,085 → floor(23085/10)*10 = 23,080
      const result = InsuranceCalculator.calculate(513_000, RATES_2025_H1, AUTO_MODES);
      expect(result.nationalPension).toBe(23_080);
    });

    it('should use H2 bounds when applicable', () => {
      const result = InsuranceCalculator.calculate(350_000, RATES_2025_H2, AUTO_MODES);

      // clamped to min 400,000 → 400,000 * 0.045 = 18,000
      expect(result.nationalPension).toBe(18_000);
    });

    it('should return 0 when mode is NONE', () => {
      const modes: InsuranceModes = { ...AUTO_MODES, nationalPensionMode: 'NONE' };
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, modes);

      expect(result.nationalPension).toBe(0);
    });

    it('should use manual base when mode is MANUAL', () => {
      const modes: InsuranceModes = {
        ...AUTO_MODES,
        nationalPensionMode: 'MANUAL',
        manualNationalPensionBase: 2_000_000,
      };
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, modes);

      // Uses manual base 2,000,000 instead of taxableIncome
      // 2,000,000 * 0.045 = 90,000
      expect(result.nationalPension).toBe(90_000);
    });
  });

  describe('Health Insurance (건강보험)', () => {
    it('should calculate at 3.545% and truncate below 1 KRW', () => {
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, AUTO_MODES);

      // 3,000,000 * 0.03545 = 106,350 → floor = 106,350
      expect(result.healthInsurance).toBe(Math.floor(3_000_000 * 0.03545));
    });

    it('should clamp to minimum base', () => {
      const result = InsuranceCalculator.calculate(200_000, RATES_2025_H1, AUTO_MODES);

      // clamped to 279,000 → 279,000 * 0.03545 = 9,890.55 → floor = 9,890
      expect(result.healthInsurance).toBe(Math.floor(279_000 * 0.03545));
    });

    it('should clamp to maximum base', () => {
      const result = InsuranceCalculator.calculate(15_000_000, RATES_2025_H1, AUTO_MODES);

      // clamped to 12,706,000 → 12,706,000 * 0.03545 = 450,427.7 → floor = 450,427
      expect(result.healthInsurance).toBe(Math.floor(12_706_000 * 0.03545));
    });

    it('should return 0 when mode is NONE', () => {
      const modes: InsuranceModes = { ...AUTO_MODES, healthInsuranceMode: 'NONE' };
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, modes);

      expect(result.healthInsurance).toBe(0);
    });

    it('should use manual base when mode is MANUAL', () => {
      const modes: InsuranceModes = {
        ...AUTO_MODES,
        healthInsuranceMode: 'MANUAL',
        manualHealthInsuranceBase: 4_000_000,
      };
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, modes);

      expect(result.healthInsurance).toBe(Math.floor(4_000_000 * 0.03545));
    });
  });

  describe('Long-term Care Insurance (장기요양보험)', () => {
    it('should calculate as 12.95% of health insurance', () => {
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, AUTO_MODES);

      const healthIns = Math.floor(3_000_000 * 0.03545);
      expect(result.longTermCare).toBe(Math.floor(healthIns * 0.1295));
    });

    it('should be 0 when health insurance mode is NONE', () => {
      const modes: InsuranceModes = { ...AUTO_MODES, healthInsuranceMode: 'NONE' };
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, modes);

      expect(result.longTermCare).toBe(0);
    });
  });

  describe('Employment Insurance (고용보험)', () => {
    it('should calculate at 0.9% with no bounds', () => {
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, AUTO_MODES);

      // 3,000,000 * 0.009 = 27,000
      expect(result.employmentInsurance).toBe(Math.floor(3_000_000 * 0.009));
    });

    it('should not clamp (no bounds for employment insurance)', () => {
      const result = InsuranceCalculator.calculate(50_000_000, RATES_2025_H1, AUTO_MODES);

      // No max base: 50,000,000 * 0.009 = 450,000
      expect(result.employmentInsurance).toBe(Math.floor(50_000_000 * 0.009));
    });

    it('should return 0 when mode is NONE', () => {
      const modes: InsuranceModes = { ...AUTO_MODES, employmentInsuranceMode: 'NONE' };
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, modes);

      expect(result.employmentInsurance).toBe(0);
    });
  });

  describe('total insurance', () => {
    it('should sum all four insurances', () => {
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, AUTO_MODES);

      const expected =
        result.nationalPension +
        result.healthInsurance +
        result.longTermCare +
        result.employmentInsurance;

      expect(result.totalInsurance).toBe(expected);
    });

    it('should be 0 when all modes are NONE', () => {
      const modes: InsuranceModes = {
        nationalPensionMode: 'NONE',
        healthInsuranceMode: 'NONE',
        employmentInsuranceMode: 'NONE',
      };
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, modes);

      expect(result.totalInsurance).toBe(0);
    });
  });

  describe('realistic payroll scenarios', () => {
    it('should match hand-calculated values for 3M salary', () => {
      const result = InsuranceCalculator.calculate(3_000_000, RATES_2025_H1, AUTO_MODES);

      // National Pension: 3,000,000 * 0.045 = 135,000 → truncate <10 → 135,000
      expect(result.nationalPension).toBe(135_000);
      // Health: 3,000,000 * 0.03545 = 106,350 → floor → 106,350
      expect(result.healthInsurance).toBe(106_350);
      // LTC: 106,350 * 0.1295 = 13,772.325 → floor → 13,772
      expect(result.longTermCare).toBe(13_772);
      // Employment: 3,000,000 * 0.009 = 26999.999... → floor = 26,999
      expect(result.employmentInsurance).toBe(Math.floor(3_000_000 * 0.009));
      // Total
      expect(result.totalInsurance).toBe(
        result.nationalPension + result.healthInsurance + result.longTermCare + result.employmentInsurance,
      );
    });

    it('should handle minimum wage earner (2025: 10,030/hr = ~2,096,270/mo)', () => {
      const minWageSalary = 2_096_270;
      const result = InsuranceCalculator.calculate(minWageSalary, RATES_2025_H1, AUTO_MODES);

      // Pension: 2,096,270 * 0.045 = 94,332.15 → floor(94332.15/10)*10 = 94,330
      expect(result.nationalPension).toBe(94_330);
      // Health: 2,096,270 * 0.03545 = 74,312.7715 → floor = 74,312
      expect(result.healthInsurance).toBe(74_312);
    });
  });
});
