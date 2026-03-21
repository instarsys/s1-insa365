/**
 * 한국 사업자등록번호 유효성 검증
 *
 * 형식: XXX-XX-XXXXX (10자리 숫자, 하이픈 선택)
 * 체크섬: 국세청 가중치 알고리즘
 */

const WEIGHTS = [1, 3, 7, 1, 3, 7, 1, 3, 5] as const;

export interface BusinessNumberResult {
  valid: boolean;
  /** 하이픈 포함 형식 (예: 123-45-67890) */
  formatted: string;
  error?: string;
}

/**
 * 사업자등록번호 유효성 검증 (형식 + 체크섬)
 */
export function validateBusinessNumber(input: string): BusinessNumberResult {
  const digits = input.replace(/[^0-9]/g, '');
  const formatted =
    digits.length === 10
      ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
      : input;

  if (digits.length !== 10) {
    return { valid: false, formatted, error: '사업자등록번호는 10자리 숫자여야 합니다.' };
  }

  // 체크섬 검증
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * WEIGHTS[i];
  }
  sum += Math.floor((Number(digits[8]) * 5) / 10);

  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== Number(digits[9])) {
    return { valid: false, formatted, error: '유효하지 않은 사업자등록번호입니다.' };
  }

  return { valid: true, formatted };
}

/**
 * 입력값에서 숫자만 추출하여 하이픈 포맷 적용
 */
export function formatBusinessNumber(input: string): string {
  const digits = input.replace(/[^0-9]/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
