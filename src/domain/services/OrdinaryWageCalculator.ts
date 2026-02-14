/**
 * OrdinaryWageCalculator — Phase 1 of the payroll engine.
 *
 * Calculates 통상임금 (ordinary wage) per the 2024 Supreme Court ruling.
 * The "fixedness" (고정성) requirement has been abolished — all regular/uniform
 * allowances now qualify as ordinary wage.
 *
 * Steps:
 *   1. Filter salary items where isOrdinaryWage === true AND type !== 'DEDUCTION'
 *   2. Convert each to monthly equivalent (bi-monthly/quarterly/annual → monthly)
 *   3. Sum = monthlyOrdinaryWage
 *   4. hourlyOrdinaryWage = Math.floor(monthlyOrdinaryWage / monthlyWorkHours)
 *
 * @see PRD Phase 1 calculation, CLAUDE.md "Ordinary wage" section
 */

import { SalaryItem, type SalaryItemProps } from '../entities/SalaryItem';

export interface OrdinaryWageResult {
  monthlyOrdinaryWage: number;
  hourlyOrdinaryWage: number;
  items: { code: string; name: string; monthlyAmount: number }[];
}

export class OrdinaryWageCalculator {
  /**
   * Calculate ordinary wage from salary items.
   * @param salaryItemProps Raw salary item data
   * @param monthlyWorkHours Standard monthly hours (default 209)
   * @param salaryType MONTHLY or HOURLY (default MONTHLY)
   * @param hourlyRate Hourly rate for HOURLY employees
   */
  static calculate(
    salaryItemProps: SalaryItemProps[],
    monthlyWorkHours: number = 209,
    salaryType: 'MONTHLY' | 'HOURLY' = 'MONTHLY',
    hourlyRate?: number,
  ): OrdinaryWageResult {
    // 시급제: hourlyRate를 직접 통상시급으로 사용
    if (salaryType === 'HOURLY' && hourlyRate !== undefined) {
      const monthlyOrdinaryWage = Math.floor(hourlyRate * monthlyWorkHours);
      return {
        monthlyOrdinaryWage,
        hourlyOrdinaryWage: hourlyRate,
        items: [{ code: 'HOURLY', name: '시급', monthlyAmount: monthlyOrdinaryWage }],
      };
    }

    const items = salaryItemProps.map((p) => new SalaryItem(p));

    // Filter: ordinary wage items that are not deductions
    const ordinaryItems = items.filter(
      (item) => item.isOrdinaryWage && !item.isDeduction(),
    );

    // Convert each to monthly equivalent and collect details
    const itemDetails = ordinaryItems.map((item) => ({
      code: item.code,
      name: item.name,
      monthlyAmount: item.toMonthlyAmount(),
    }));

    const monthlyOrdinaryWage = itemDetails.reduce(
      (sum, item) => sum + item.monthlyAmount,
      0,
    );

    // Hourly rate = monthly / standard hours, floored to integer
    const hourlyOrdinaryWage =
      monthlyWorkHours > 0
        ? Math.floor(monthlyOrdinaryWage / monthlyWorkHours)
        : 0;

    return {
      monthlyOrdinaryWage,
      hourlyOrdinaryWage,
      items: itemDetails,
    };
  }
}
