/**
 * InsuranceCalculator — calculates the 4 social insurance premiums (4대보험).
 *
 * Korean social insurance system (employee share):
 *
 * | Insurance         | Rate (2025)  | Rounding         | Base Bounds (2025.1-6)     |
 * |-------------------|-------------|------------------|----------------------------|
 * | National Pension  | 4.5%        | truncate <10 KRW | min 390K, max 6,170K       |
 * | Health Insurance  | 3.545%      | truncate <1 KRW  | min 279K, max 12,706K      |
 * | Long-term Care    | 12.95% of HI| truncate <1 KRW  | (based on HI amount)       |
 * | Employment Ins.   | 0.9%        | truncate <1 KRW  | (no bounds)                |
 *
 * Each insurance type supports 3 modes per employee:
 * - AUTO: Calculate from taxable income (clamped to legal bounds)
 * - MANUAL: Use employee's manually set base amount
 * - NONE: Exempt (returns 0)
 */

import type { InsuranceRateSet } from './types';

export interface InsuranceResult {
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  totalInsurance: number;
}

export interface InsuranceModes {
  nationalPensionMode: 'AUTO' | 'MANUAL' | 'NONE';
  healthInsuranceMode: 'AUTO' | 'MANUAL' | 'NONE';
  employmentInsuranceMode: 'AUTO' | 'MANUAL' | 'NONE';
  manualNationalPensionBase?: number;
  manualHealthInsuranceBase?: number;
}

export class InsuranceCalculator {
  /**
   * Calculate all 4 social insurance premiums.
   * @param taxableIncome Employee's taxable income for the month
   * @param rates Insurance rate set for the calculation period
   * @param modes Per-employee insurance mode settings
   */
  static calculate(
    taxableIncome: number,
    rates: InsuranceRateSet,
    modes: InsuranceModes,
  ): InsuranceResult {
    // National Pension (국민연금)
    const nationalPension = InsuranceCalculator.calculateNationalPension(
      taxableIncome,
      rates,
      modes,
    );

    // Health Insurance (건강보험)
    const healthInsurance = InsuranceCalculator.calculateHealthInsurance(
      taxableIncome,
      rates,
      modes,
    );

    // Long-term Care Insurance (장기요양보험) — percentage of health insurance
    const longTermCare =
      modes.healthInsuranceMode === 'NONE'
        ? 0
        : Math.floor(healthInsurance * rates.longTermCare.rate);

    // Employment Insurance (고용보험)
    const employmentInsurance = InsuranceCalculator.calculateEmploymentInsurance(
      taxableIncome,
      rates,
      modes,
    );

    const totalInsurance =
      nationalPension + healthInsurance + longTermCare + employmentInsurance;

    return {
      nationalPension,
      healthInsurance,
      longTermCare,
      employmentInsurance,
      totalInsurance,
    };
  }

  /**
   * National Pension: clamp base to [min, max], multiply by rate, truncate below 10 KRW.
   */
  private static calculateNationalPension(
    taxableIncome: number,
    rates: InsuranceRateSet,
    modes: InsuranceModes,
  ): number {
    if (modes.nationalPensionMode === 'NONE') return 0;

    const baseAmount =
      modes.nationalPensionMode === 'MANUAL' && modes.manualNationalPensionBase != null
        ? modes.manualNationalPensionBase
        : taxableIncome;

    const clamped = Math.min(
      Math.max(baseAmount, rates.nationalPension.minBase),
      rates.nationalPension.maxBase,
    );

    // Truncate below 10 KRW
    return Math.floor((clamped * rates.nationalPension.rate) / 10) * 10;
  }

  /**
   * Health Insurance: clamp base to [min, max], multiply by rate, truncate below 1 KRW.
   */
  private static calculateHealthInsurance(
    taxableIncome: number,
    rates: InsuranceRateSet,
    modes: InsuranceModes,
  ): number {
    if (modes.healthInsuranceMode === 'NONE') return 0;

    const baseAmount =
      modes.healthInsuranceMode === 'MANUAL' && modes.manualHealthInsuranceBase != null
        ? modes.manualHealthInsuranceBase
        : taxableIncome;

    const clamped = Math.min(
      Math.max(baseAmount, rates.healthInsurance.minBase),
      rates.healthInsurance.maxBase,
    );

    // Truncate below 1 KRW
    return Math.floor(clamped * rates.healthInsurance.rate);
  }

  /**
   * Employment Insurance: no bounds, multiply by rate, truncate below 1 KRW.
   */
  private static calculateEmploymentInsurance(
    taxableIncome: number,
    rates: InsuranceRateSet,
    modes: InsuranceModes,
  ): number {
    if (modes.employmentInsuranceMode === 'NONE') return 0;

    // Employment insurance has no base bounds
    return Math.floor(taxableIncome * rates.employmentInsurance.rate);
  }
}
