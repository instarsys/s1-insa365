import { describe, it, expect } from 'vitest';
import { validateBusinessNumber, formatBusinessNumber } from '../BusinessNumber';

describe('validateBusinessNumber', () => {
  describe('유효한 사업자번호', () => {
    it('하이픈 포함 형식 (123-45-67891)', () => {
      const result = validateBusinessNumber('123-45-67891');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('123-45-67891');
      expect(result.error).toBeUndefined();
    });

    it('하이픈 없는 형식 (1234567891)', () => {
      const result = validateBusinessNumber('1234567891');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('123-45-67891');
    });

    it('모두 0 (000-00-00000)', () => {
      const result = validateBusinessNumber('000-00-00000');
      expect(result.valid).toBe(true);
    });

    it('다양한 유효 번호', () => {
      expect(validateBusinessNumber('2208700003').valid).toBe(true);
      expect(validateBusinessNumber('1018200537').valid).toBe(true);
      expect(validateBusinessNumber('1111111119').valid).toBe(true);
    });
  });

  describe('유효하지 않은 사업자번호', () => {
    it('자릿수 부족 (9자리)', () => {
      const result = validateBusinessNumber('123-45-6789');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('사업자등록번호는 10자리 숫자여야 합니다.');
    });

    it('자릿수 초과 (11자리)', () => {
      const result = validateBusinessNumber('123-45-678901');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('사업자등록번호는 10자리 숫자여야 합니다.');
    });

    it('빈 문자열', () => {
      const result = validateBusinessNumber('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('사업자등록번호는 10자리 숫자여야 합니다.');
    });

    it('체크섬 불일치 (123-45-67890)', () => {
      const result = validateBusinessNumber('123-45-67890');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('유효하지 않은 사업자등록번호입니다.');
    });

    it('문자 포함 시 숫자만 추출 후 자릿수 검증', () => {
      const result = validateBusinessNumber('abc1234def');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('사업자등록번호는 10자리 숫자여야 합니다.');
    });
  });
});

describe('formatBusinessNumber', () => {
  it('10자리 숫자 → XXX-XX-XXXXX', () => {
    expect(formatBusinessNumber('1234567890')).toBe('123-45-67890');
  });

  it('3자리 이하 → 그대로', () => {
    expect(formatBusinessNumber('123')).toBe('123');
  });

  it('4~5자리 → XXX-XX', () => {
    expect(formatBusinessNumber('12345')).toBe('123-45');
  });

  it('6자리 이상 → XXX-XX-X...', () => {
    expect(formatBusinessNumber('123456')).toBe('123-45-6');
  });

  it('이미 하이픈 포함 → 숫자 추출 후 재포맷', () => {
    expect(formatBusinessNumber('123-45-678')).toBe('123-45-678');
  });

  it('10자리 초과 → 10자리까지만', () => {
    expect(formatBusinessNumber('12345678901234')).toBe('123-45-67890');
  });
});
