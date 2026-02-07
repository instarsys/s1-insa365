/**
 * Money value object — represents Korean Won (KRW).
 *
 * KRW has no fractional unit, so all amounts are integers.
 * All arithmetic operations return new Money instances (immutable).
 */
export class Money {
  private constructor(private readonly _amount: number) {
    if (!Number.isFinite(_amount)) {
      throw new Error('Money amount must be a finite number');
    }
    this._amount = Math.floor(_amount);
  }

  get amount(): number {
    return this._amount;
  }

  /** Create Money from a KRW amount */
  static won(amount: number): Money {
    return new Money(amount);
  }

  /** Zero KRW */
  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return new Money(this._amount + other._amount);
  }

  subtract(other: Money): Money {
    return new Money(this._amount - other._amount);
  }

  /**
   * Multiply by a factor and floor the result.
   * Used for proration ratios, premium multipliers, etc.
   */
  multiply(factor: number): Money {
    return new Money(Math.floor(this._amount * factor));
  }

  /**
   * Truncate below the given unit.
   * - National pension: truncateBelow(10) — truncate below 10 KRW
   * - Health/employment insurance: truncateBelow(1) — same as Math.floor (already integer)
   */
  truncateBelow(unit: number): Money {
    if (unit <= 0) {
      throw new Error('Truncation unit must be positive');
    }
    return new Money(Math.floor(this._amount / unit) * unit);
  }

  isPositive(): boolean {
    return this._amount > 0;
  }

  isZero(): boolean {
    return this._amount === 0;
  }

  isNegative(): boolean {
    return this._amount < 0;
  }

  equals(other: Money): boolean {
    return this._amount === other._amount;
  }

  isGreaterThan(other: Money): boolean {
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    return this._amount < other._amount;
  }

  /** Format as Korean Won display string, e.g. "1,234,567원" */
  formatKRW(): string {
    const formatted = Math.abs(this._amount).toLocaleString('ko-KR');
    return this._amount < 0 ? `-${formatted}원` : `${formatted}원`;
  }
}
