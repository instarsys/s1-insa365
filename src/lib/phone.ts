/**
 * 전화번호 포맷팅/스트립 유틸리티
 * DB에는 숫자만 저장, 화면에는 하이픈(-) 포함 표시
 */

export function stripPhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatPhoneNumber(value: string): string {
  const d = value.replace(/\D/g, '');
  if (!d) return '';

  // 대표번호: 15XX, 16XX, 18XX → XXXX-XXXX
  if (/^1[568]/.test(d)) {
    if (d.length <= 4) return d;
    return `${d.slice(0, 4)}-${d.slice(4, 8)}`;
  }

  // 서울 02 → 02-XXX-XXXX 또는 02-XXXX-XXXX
  if (d.startsWith('02')) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `02-${d.slice(2)}`;
    if (d.length <= 9) return `02-${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    return `02-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }

  // 0XX (휴대폰/인터넷/지역) → 0XX-XXX-XXXX 또는 0XX-XXXX-XXXX
  if (d.startsWith('0')) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
  }

  return d;
}
