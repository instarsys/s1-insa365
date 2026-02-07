/**
 * TaxExemptSeparator — Phase 3 of the payroll engine.
 *
 * Separates taxable and non-taxable (비과세) income from gross pay.
 *
 * Korean tax law allows certain allowances to be tax-exempt up to monthly limits:
 * - Meals (식대): 200,000 KRW/month (2025)
 * - Vehicle maintenance (자가운전보조금): 200,000 KRW/month
 * - Childcare (보육수당): 200,000 KRW/month
 *
 * For each tax-exempt salary item:
 *   applied = min(itemAmount, limit.monthlyLimit)
 *
 * taxableIncome = totalPay - totalNonTaxable
 */

import { SalaryItem, type SalaryItemProps } from '../entities/SalaryItem';
import type { TaxExemptLimitEntry } from './types';

export interface TaxExemptResult {
  totalNonTaxable: number;
  taxableIncome: number;
  nonTaxableItems: {
    code: string;
    name: string;
    amount: number;
    limit: number;
    applied: number;
  }[];
}

export class TaxExemptSeparator {
  /**
   * Separate tax-exempt amounts from gross pay.
   * @param salaryItemProps All salary items for this employee
   * @param totalPay Total gross pay (from Phase 2)
   * @param taxExemptLimits Legal tax-exempt limits per category
   */
  static calculate(
    salaryItemProps: SalaryItemProps[],
    totalPay: number,
    taxExemptLimits: TaxExemptLimitEntry[],
  ): TaxExemptResult {
    const items = salaryItemProps.map((p) => new SalaryItem(p));

    // Build a lookup map for limits by code
    const limitMap = new Map<string, TaxExemptLimitEntry>();
    for (const limit of taxExemptLimits) {
      limitMap.set(limit.code, limit);
    }

    // Find all tax-exempt items and apply limits
    const nonTaxableItems: TaxExemptResult['nonTaxableItems'] = [];

    for (const item of items) {
      if (!item.isTaxExempt || item.isDeduction()) continue;

      const limit = item.taxExemptCode ? limitMap.get(item.taxExemptCode) : undefined;
      const monthlyLimit = limit?.monthlyLimit ?? 0;

      // Applied amount = min(item amount, monthly limit)
      // If no limit found, the full amount is considered non-taxable
      // (this handles items that are fully tax-exempt with no cap)
      const applied = monthlyLimit > 0
        ? Math.min(item.amount, monthlyLimit)
        : item.amount;

      nonTaxableItems.push({
        code: item.code,
        name: item.name,
        amount: item.amount,
        limit: monthlyLimit,
        applied,
      });
    }

    const totalNonTaxable = nonTaxableItems.reduce(
      (sum, item) => sum + item.applied,
      0,
    );

    const taxableIncome = totalPay - totalNonTaxable;

    return {
      totalNonTaxable,
      taxableIncome,
      nonTaxableItems,
    };
  }
}
