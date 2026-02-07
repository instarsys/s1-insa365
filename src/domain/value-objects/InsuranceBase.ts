/**
 * InsuranceBase value object — the base amount used for insurance premium calculations.
 *
 * Each insurance type (national pension, health insurance) has legal minimum and maximum
 * bounds. This value object handles clamping to those bounds.
 *
 * Example: National pension 2025.1-6: min 390,000, max 6,170,000
 */
import { Money } from './Money';

export class InsuranceBase {
  private constructor(private readonly _amount: Money) {}

  get amount(): Money {
    return this._amount;
  }

  static from(amount: Money): InsuranceBase {
    return new InsuranceBase(amount);
  }

  static fromNumber(amount: number): InsuranceBase {
    return new InsuranceBase(Money.won(amount));
  }

  /**
   * Clamp the base amount within legal minimum and maximum bounds.
   * If the amount is below min, it becomes min.
   * If the amount is above max, it becomes max.
   */
  clamp(min: Money, max: Money): InsuranceBase {
    if (this._amount.isLessThan(min)) {
      return new InsuranceBase(min);
    }
    if (this._amount.isGreaterThan(max)) {
      return new InsuranceBase(max);
    }
    return this;
  }

  equals(other: InsuranceBase): boolean {
    return this._amount.equals(other._amount);
  }
}
