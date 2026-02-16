import { describe, it, expect } from 'vitest';
import { FormulaEngine, FormulaError } from '../FormulaEngine';
import type { FormulaContextWithTax, TaxBracketForFormula } from '../FormulaEngine';

// ─── Tokenizer + Parser ────────────────────────────────────────

describe('FormulaEngine', () => {
  describe('validate()', () => {
    it('should validate a simple number', () => {
      const result = FormulaEngine.validate('42');
      expect(result.valid).toBe(true);
      expect(result.variables).toEqual([]);
    });

    it('should validate a simple expression', () => {
      const result = FormulaEngine.validate('1 + 2');
      expect(result.valid).toBe(true);
    });

    it('should validate Korean variable names', () => {
      const result = FormulaEngine.validate('통상시급 * 1.5');
      expect(result.valid).toBe(true);
      expect(result.variables).toEqual(['통상시급']);
    });

    it('should validate complex formula', () => {
      const result = FormulaEngine.validate('floor(통상시급 * 1.5 * 연장근로분 / 60)');
      expect(result.valid).toBe(true);
      expect(result.variables).toEqual(['통상시급', '연장근로분']);
    });

    it('should return error for empty string', () => {
      const result = FormulaEngine.validate('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('수식이 비어 있습니다');
    });

    it('should return error for whitespace only', () => {
      const result = FormulaEngine.validate('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('수식이 비어 있습니다');
    });

    it('should return error for unmatched parenthesis', () => {
      const result = FormulaEngine.validate('floor(1 + 2');
      expect(result.valid).toBe(false);
    });

    it('should return error for unknown character', () => {
      const result = FormulaEngine.validate('1 @ 2');
      expect(result.valid).toBe(false);
    });

    it('should return error for consecutive operators', () => {
      const result = FormulaEngine.validate('1 + * 2');
      expect(result.valid).toBe(false);
    });

    it('should validate nested function calls', () => {
      const result = FormulaEngine.validate('floor(max(1, 2) * 3)');
      expect(result.valid).toBe(true);
      expect(result.variables).toEqual([]);
    });

    it('should validate multi-variable formula', () => {
      const result = FormulaEngine.validate(
        'floor(통상시급 * 1.5 * 휴일근로분_8이내 / 60) + floor(통상시급 * 2.0 * 휴일근로분_8초과 / 60)',
      );
      expect(result.valid).toBe(true);
      expect(result.variables).toContain('통상시급');
      expect(result.variables).toContain('휴일근로분_8이내');
      expect(result.variables).toContain('휴일근로분_8초과');
    });
  });

  // ─── extractVariables ─────────────────────────────────────────

  describe('extractVariables()', () => {
    it('should extract variables from formula', () => {
      const vars = FormulaEngine.extractVariables('통상시급 * 1.5 * 연장근로분 / 60');
      expect(vars).toEqual(['통상시급', '연장근로분']);
    });

    it('should return empty for numeric formula', () => {
      const vars = FormulaEngine.extractVariables('1 + 2 * 3');
      expect(vars).toEqual([]);
    });

    it('should deduplicate variables', () => {
      const vars = FormulaEngine.extractVariables('통상시급 * 통상시급');
      expect(vars).toEqual(['통상시급']);
    });

    it('should handle invalid formula gracefully', () => {
      const vars = FormulaEngine.extractVariables('1 @@ invalid');
      expect(vars).toEqual([]);
    });
  });

  // ─── evaluate — 기본 연산 ───────────────────────────────────────

  describe('evaluate() - basic arithmetic', () => {
    it('should evaluate addition', () => {
      expect(FormulaEngine.evaluate('1 + 2', {})).toBe(3);
    });

    it('should evaluate subtraction', () => {
      expect(FormulaEngine.evaluate('10 - 3', {})).toBe(7);
    });

    it('should evaluate multiplication', () => {
      expect(FormulaEngine.evaluate('4 * 5', {})).toBe(20);
    });

    it('should evaluate division', () => {
      expect(FormulaEngine.evaluate('10 / 4', {})).toBe(2.5);
    });

    it('should respect operator precedence (* before +)', () => {
      expect(FormulaEngine.evaluate('1 + 2 * 3', {})).toBe(7);
    });

    it('should respect parentheses', () => {
      expect(FormulaEngine.evaluate('(1 + 2) * 3', {})).toBe(9);
    });

    it('should handle unary minus', () => {
      expect(FormulaEngine.evaluate('-5', {})).toBe(-5);
    });

    it('should handle double negation', () => {
      expect(FormulaEngine.evaluate('--5', {})).toBe(5);
    });

    it('should handle decimal numbers', () => {
      expect(FormulaEngine.evaluate('1.5 * 2', {})).toBe(3);
    });

    it('should throw on division by zero', () => {
      expect(() => FormulaEngine.evaluate('1 / 0', {})).toThrow('0으로 나눌 수 없습니다');
    });
  });

  // ─── evaluate — 변수 ──────────────────────────────────────────

  describe('evaluate() - variables', () => {
    it('should resolve Korean variable', () => {
      expect(FormulaEngine.evaluate('통상시급', { 통상시급: 15311 })).toBe(15311);
    });

    it('should compute with variables', () => {
      const ctx = { 통상시급: 15311, 연장근로분: 600 };
      const result = FormulaEngine.evaluate('통상시급 * 1.5 * 연장근로분 / 60', ctx);
      expect(result).toBe(15311 * 1.5 * 600 / 60);
    });

    it('should throw on undefined variable', () => {
      expect(() => FormulaEngine.evaluate('미정의변수', {}))
        .toThrow("정의되지 않은 변수: '미정의변수'");
    });
  });

  // ─── evaluate — 내장 함수 ─────────────────────────────────────

  describe('evaluate() - built-in functions', () => {
    it('floor()', () => {
      expect(FormulaEngine.evaluate('floor(3.7)', {})).toBe(3);
      expect(FormulaEngine.evaluate('floor(-1.2)', {})).toBe(-2);
    });

    it('round()', () => {
      expect(FormulaEngine.evaluate('round(3.5)', {})).toBe(4);
      expect(FormulaEngine.evaluate('round(3.4)', {})).toBe(3);
    });

    it('min()', () => {
      expect(FormulaEngine.evaluate('min(10, 20)', {})).toBe(10);
      expect(FormulaEngine.evaluate('min(5, 3, 8)', {})).toBe(3);
    });

    it('max()', () => {
      expect(FormulaEngine.evaluate('max(10, 20)', {})).toBe(20);
      expect(FormulaEngine.evaluate('max(5, 3, 8)', {})).toBe(8);
    });

    it('truncate1() — 1원 미만 절사', () => {
      expect(FormulaEngine.evaluate('truncate1(12345.67)', {})).toBe(12345);
    });

    it('truncate10() — 10원 미만 절사', () => {
      expect(FormulaEngine.evaluate('truncate10(12345)', {})).toBe(12340);
      expect(FormulaEngine.evaluate('truncate10(12349)', {})).toBe(12340);
    });

    it('clamp()', () => {
      expect(FormulaEngine.evaluate('clamp(500, 100, 1000)', {})).toBe(500);
      expect(FormulaEngine.evaluate('clamp(50, 100, 1000)', {})).toBe(100);
      expect(FormulaEngine.evaluate('clamp(2000, 100, 1000)', {})).toBe(1000);
    });

    it('should throw on wrong argument count', () => {
      expect(() => FormulaEngine.evaluate('floor()', {})).toThrow('인수 1개 필요');
      expect(() => FormulaEngine.evaluate('floor(1, 2)', {})).toThrow('인수 1개 필요');
      expect(() => FormulaEngine.evaluate('min(1)', {})).toThrow('인수 2개 이상');
      expect(() => FormulaEngine.evaluate('clamp(1, 2)', {})).toThrow('인수 3개 필요');
    });
  });

  // ─── evaluate — taxLookup ─────────────────────────────────────

  describe('evaluate() - taxLookup', () => {
    const brackets: TaxBracketForFormula[] = [
      { minIncome: 0, maxIncome: 1000000, dependents: 1, taxAmount: 0 },
      { minIncome: 1000000, maxIncome: 2000000, dependents: 1, taxAmount: 15000 },
      { minIncome: 2000000, maxIncome: 3000000, dependents: 1, taxAmount: 50000 },
      { minIncome: 3000000, maxIncome: 4000000, dependents: 1, taxAmount: 90000 },
      { minIncome: 3000000, maxIncome: 4000000, dependents: 2, taxAmount: 70000 },
    ];

    it('should lookup income tax from bracket table', () => {
      const ctx: FormulaContextWithTax = {
        과세소득: 3500000,
        부양가족수: 1,
        __taxBrackets__: brackets,
      };
      expect(FormulaEngine.evaluate('taxLookup(과세소득, 부양가족수)', ctx)).toBe(90000);
    });

    it('should use dependents=2 when available', () => {
      const ctx: FormulaContextWithTax = {
        과세소득: 3500000,
        부양가족수: 2,
        __taxBrackets__: brackets,
      };
      expect(FormulaEngine.evaluate('taxLookup(과세소득, 부양가족수)', ctx)).toBe(70000);
    });

    it('should return 0 for income ≤ 0', () => {
      const ctx: FormulaContextWithTax = {
        과세소득: 0,
        부양가족수: 1,
        __taxBrackets__: brackets,
      };
      expect(FormulaEngine.evaluate('taxLookup(과세소득, 부양가족수)', ctx)).toBe(0);
    });

    it('should throw without tax bracket data', () => {
      expect(() =>
        FormulaEngine.evaluate('taxLookup(3000000, 1)', {}),
      ).toThrow('간이세액표 데이터가 없습니다');
    });
  });

  // ─── 실제 급여 산식 테스트 ────────────────────────────────────

  describe('real payroll formulas', () => {
    const baseCtx = {
      통상시급: 15311,
      연장근로분: 600,
      야간근로분: 120,
      야간연장근로분: 0,
      휴일근로분_8이내: 480,
      휴일근로분_8초과: 120,
      휴일야간근로분_8이내: 0,
      휴일야간근로분_8초과: 0,
    };

    it('A08: 연장근로수당 = floor(통상시급 * 1.5 * 연장근로분 / 60)', () => {
      const formula = 'floor(통상시급 * 1.5 * 연장근로분 / 60)';
      const result = FormulaEngine.evaluate(formula, baseCtx);
      const expected = Math.floor(15311 * 1.5 * 600 / 60);
      expect(result).toBe(expected);
    });

    it('A09: 야간근로수당 = floor(통상시급 * 0.5 * 야간근로분 / 60)', () => {
      const formula = 'floor(통상시급 * 0.5 * 야간근로분 / 60)';
      const result = FormulaEngine.evaluate(formula, baseCtx);
      const expected = Math.floor(15311 * 0.5 * 120 / 60);
      expect(result).toBe(expected);
    });

    it('A10: 휴일근로수당 (split 8h)', () => {
      const formula =
        'floor(통상시급 * 1.5 * 휴일근로분_8이내 / 60) + floor(통상시급 * 2.0 * 휴일근로분_8초과 / 60)';
      const result = FormulaEngine.evaluate(formula, baseCtx);
      const within8 = Math.floor(15311 * 1.5 * 480 / 60);
      const over8 = Math.floor(15311 * 2.0 * 120 / 60);
      expect(result).toBe(within8 + over8);
    });

    it('A11: 주휴수당 = floor(통상시급 * 8)', () => {
      const formula = 'floor(통상시급 * 8)';
      const result = FormulaEngine.evaluate(formula, baseCtx);
      expect(result).toBe(Math.floor(15311 * 8));
    });
  });

  describe('real deduction formulas', () => {
    const brackets: TaxBracketForFormula[] = [
      { minIncome: 3000000, maxIncome: 4000000, dependents: 1, taxAmount: 90000 },
    ];

    const deductionCtx: FormulaContextWithTax = {
      과세소득: 3200000,
      비과세합계: 400000,
      총지급액: 3600000,
      연금기준소득: 3200000,
      건강보험기준소득: 3200000,
      연금하한: 390000,
      연금상한: 6170000,
      국민연금요율: 4.5,
      건강보험요율: 3.545,
      장기요양요율: 12.95,
      고용보험요율: 0.9,
      부양가족수: 1,
      __taxBrackets__: brackets,
    };

    it('D01: 국민연금 = truncate10(clamp(연금기준소득, 연금하한, 연금상한) * 국민연금요율 / 100)', () => {
      const formula = 'truncate10(clamp(연금기준소득, 연금하한, 연금상한) * 국민연금요율 / 100)';
      const result = FormulaEngine.evaluate(formula, deductionCtx);
      const clamped = Math.min(Math.max(3200000, 390000), 6170000);
      const expected = Math.floor((clamped * 4.5 / 100) / 10) * 10;
      expect(result).toBe(expected);
    });

    it('D02: 건강보험 = truncate1(건강보험기준소득 * 건강보험요율 / 100)', () => {
      const formula = 'truncate1(건강보험기준소득 * 건강보험요율 / 100)';
      const result = FormulaEngine.evaluate(formula, deductionCtx);
      const expected = Math.floor(3200000 * 3.545 / 100);
      expect(result).toBe(expected);
    });

    it('D03: 장기요양보험 = truncate1(건강보험 * 장기요양요율 / 100)', () => {
      // 건강보험 먼저 계산하여 cascade context에 넣어야 함
      const healthIns = Math.floor(3200000 * 3.545 / 100);
      const ctx = { ...deductionCtx, 건강보험: healthIns };
      const formula = 'truncate1(건강보험 * 장기요양요율 / 100)';
      const result = FormulaEngine.evaluate(formula, ctx);
      const expected = Math.floor(healthIns * 12.95 / 100);
      expect(result).toBe(expected);
    });

    it('D04: 고용보험 = truncate1(과세소득 * 고용보험요율 / 100)', () => {
      const formula = 'truncate1(과세소득 * 고용보험요율 / 100)';
      const result = FormulaEngine.evaluate(formula, deductionCtx);
      const expected = Math.floor(3200000 * 0.9 / 100);
      expect(result).toBe(expected);
    });

    it('D05: 소득세 = taxLookup(과세소득, 부양가족수)', () => {
      const formula = 'taxLookup(과세소득, 부양가족수)';
      const result = FormulaEngine.evaluate(formula, deductionCtx);
      expect(result).toBe(90000);
    });

    it('D06: 지방소득세 = floor(소득세 * 10 / 100)', () => {
      const ctx = { ...deductionCtx, 소득세: 90000 };
      const formula = 'floor(소득세 * 10 / 100)';
      const result = FormulaEngine.evaluate(formula, ctx);
      expect(result).toBe(Math.floor(90000 * 10 / 100));
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle nested parentheses', () => {
      expect(FormulaEngine.evaluate('((1 + 2) * (3 + 4))', {})).toBe(21);
    });

    it('should handle complex nested functions', () => {
      expect(FormulaEngine.evaluate('floor(max(100, 200) * min(3, 5) / 2)', {})).toBe(300);
    });

    it('should handle variables with underscores', () => {
      expect(
        FormulaEngine.evaluate('휴일근로분_8이내 + 휴일근로분_8초과', {
          휴일근로분_8이내: 480,
          휴일근로분_8초과: 120,
        }),
      ).toBe(600);
    });

    it('should handle zero values', () => {
      expect(FormulaEngine.evaluate('floor(통상시급 * 0)', { 통상시급: 15311 })).toBe(0);
    });

    it('should parse a single variable', () => {
      expect(FormulaEngine.evaluate('x', { x: 42 })).toBe(42);
    });

    it('should handle large numbers correctly', () => {
      expect(FormulaEngine.evaluate('floor(10000000 * 0.045)', {})).toBe(450000);
    });
  });

  // ─── Error handling ──────────────────────────────────────────

  describe('error handling', () => {
    it('should throw FormulaError for unknown function', () => {
      expect(() => FormulaEngine.evaluate('unknown(1)', {})).toThrow();
    });

    it('should give meaningful error for missing closing paren', () => {
      const result = FormulaEngine.validate('(1 + 2');
      expect(result.valid).toBe(false);
    });

    it('should give meaningful error for extra closing paren', () => {
      const result = FormulaEngine.validate('1 + 2)');
      expect(result.valid).toBe(false);
    });
  });
});
