/**
 * TaxCalculator — calculates income tax using the simplified tax table (간이세액표).
 *
 * Korean income tax withholding uses a lookup table indexed by:
 * - Monthly taxable income range
 * - Number of dependents (부양가족 수)
 *
 * The table provides the monthly tax amount directly (no formula calculation).
 *
 * Local income tax (지방소득세) = 10% of income tax.
 * Both are truncated to integer KRW.
 */

import type { TaxBracketEntry } from './types';

export interface TaxResult {
  incomeTax: number;
  localIncomeTax: number;
  totalTax: number;
}

export class TaxCalculator {
  /**
   * Calculate income tax and local income tax.
   * @param taxableIncome Monthly taxable income in KRW
   * @param dependents Number of dependents (including the employee)
   * @param taxBrackets Simplified tax table entries
   */
  static calculate(
    taxableIncome: number,
    dependents: number,
    taxBrackets: TaxBracketEntry[],
  ): TaxResult {
    if (taxableIncome <= 0) {
      return { incomeTax: 0, localIncomeTax: 0, totalTax: 0 };
    }

    // Find the matching bracket for the income range and dependents count
    const bracket = taxBrackets.find(
      (b) =>
        taxableIncome >= b.minIncome &&
        taxableIncome < b.maxIncome &&
        b.dependents === dependents,
    );

    // If no exact dependents match, try the highest available dependents count
    // that doesn't exceed the employee's dependents
    const fallbackBracket = bracket
      ? undefined
      : taxBrackets
          .filter(
            (b) =>
              taxableIncome >= b.minIncome &&
              taxableIncome < b.maxIncome &&
              b.dependents <= dependents,
          )
          .sort((a, b) => b.dependents - a.dependents)[0];

    const matchedBracket = bracket ?? fallbackBracket;

    const incomeTax = matchedBracket?.taxAmount ?? 0;
    const localIncomeTax = Math.floor(incomeTax * 0.1);
    const totalTax = incomeTax + localIncomeTax;

    return { incomeTax, localIncomeTax, totalTax };
  }
}
