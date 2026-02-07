import { describe, it, expect } from 'vitest';
import { Money } from '../Money';

describe('Money', () => {
  describe('creation', () => {
    it('should create from integer amount', () => {
      const m = Money.won(1_000_000);
      expect(m.amount).toBe(1_000_000);
    });

    it('should floor decimal amounts', () => {
      const m = Money.won(1_234.56);
      expect(m.amount).toBe(1_234);
    });

    it('should create zero', () => {
      const m = Money.zero();
      expect(m.amount).toBe(0);
    });

    it('should throw on non-finite', () => {
      expect(() => Money.won(Infinity)).toThrow();
      expect(() => Money.won(NaN)).toThrow();
    });
  });

  describe('arithmetic', () => {
    it('should add correctly', () => {
      const a = Money.won(1_000_000);
      const b = Money.won(500_000);
      expect(a.add(b).amount).toBe(1_500_000);
    });

    it('should subtract correctly', () => {
      const a = Money.won(3_000_000);
      const b = Money.won(1_200_000);
      expect(a.subtract(b).amount).toBe(1_800_000);
    });

    it('should allow negative results from subtraction', () => {
      const a = Money.won(100_000);
      const b = Money.won(200_000);
      expect(a.subtract(b).amount).toBe(-100_000);
    });

    it('should multiply and floor', () => {
      const m = Money.won(3_000_000);
      expect(m.multiply(0.045).amount).toBe(135_000);
    });

    it('should multiply with proper flooring', () => {
      const m = Money.won(513_000);
      // 513,000 * 0.045 = 23,085
      expect(m.multiply(0.045).amount).toBe(23_085);
    });

    it('should multiply by proration ratio', () => {
      const m = Money.won(3_000_000);
      const ratio = 16 / 31;
      expect(m.multiply(ratio).amount).toBe(Math.floor(3_000_000 * ratio));
    });
  });

  describe('truncateBelow', () => {
    it('should truncate below 10 (pension rounding)', () => {
      const m = Money.won(23_085);
      expect(m.truncateBelow(10).amount).toBe(23_080);
    });

    it('should not change amounts already at boundary', () => {
      const m = Money.won(135_000);
      expect(m.truncateBelow(10).amount).toBe(135_000);
    });

    it('should truncate below 1 (no-op for integers)', () => {
      const m = Money.won(106_350);
      expect(m.truncateBelow(1).amount).toBe(106_350);
    });

    it('should truncate below 100', () => {
      const m = Money.won(12_345);
      expect(m.truncateBelow(100).amount).toBe(12_300);
    });

    it('should throw for non-positive unit', () => {
      const m = Money.won(1000);
      expect(() => m.truncateBelow(0)).toThrow();
      expect(() => m.truncateBelow(-1)).toThrow();
    });
  });

  describe('comparisons', () => {
    it('should check positive/zero/negative', () => {
      expect(Money.won(1).isPositive()).toBe(true);
      expect(Money.won(0).isZero()).toBe(true);
      expect(Money.won(-1).isNegative()).toBe(true);
    });

    it('should check equality', () => {
      expect(Money.won(1000).equals(Money.won(1000))).toBe(true);
      expect(Money.won(1000).equals(Money.won(999))).toBe(false);
    });

    it('should compare greater/less', () => {
      expect(Money.won(2000).isGreaterThan(Money.won(1000))).toBe(true);
      expect(Money.won(1000).isLessThan(Money.won(2000))).toBe(true);
    });
  });

  describe('formatKRW', () => {
    it('should format positive amounts', () => {
      expect(Money.won(1_234_567).formatKRW()).toBe('1,234,567원');
    });

    it('should format negative amounts', () => {
      expect(Money.won(-500_000).formatKRW()).toBe('-500,000원');
    });

    it('should format zero', () => {
      expect(Money.won(0).formatKRW()).toBe('0원');
    });
  });

  describe('immutability', () => {
    it('should not mutate original on operations', () => {
      const a = Money.won(1_000_000);
      const b = a.add(Money.won(500_000));

      expect(a.amount).toBe(1_000_000);
      expect(b.amount).toBe(1_500_000);
    });
  });
});
