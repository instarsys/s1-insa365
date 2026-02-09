/**
 * LeaveAccrualCalculator — 연차 발생 계산기 (순수 도메인 서비스)
 *
 * 근로기준법 제60조 기반:
 *   - 1년 미만: 매월 1개, 최대 11개 (월별 발생)
 *   - 1년 이상: 기본 15일
 *   - 3년 이상: 2년마다 1일 가산
 *   - 최대: 25일
 *
 * 외부 의존성 없음 (domain 레이어 규칙).
 */

export interface AccrualTier {
  serviceMonthFrom: number;
  serviceMonthTo: number;
  accrualDays: number;
  validMonths?: number;
}

/**
 * 입사일부터 기준일까지의 근속 개월수 계산
 * @param joinDate 입사일
 * @param referenceDate 기준일
 * @returns 근속 개월수 (소수 버림, 음수 방지)
 */
export function calculateServiceMonths(joinDate: Date, referenceDate: Date): number {
  if (referenceDate <= joinDate) return 0;

  const years = referenceDate.getFullYear() - joinDate.getFullYear();
  const months = referenceDate.getMonth() - joinDate.getMonth();
  const dayDiff = referenceDate.getDate() - joinDate.getDate();

  let totalMonths = years * 12 + months;
  if (dayDiff < 0) {
    totalMonths -= 1;
  }

  return Math.max(0, totalMonths);
}

/**
 * 근속 개월수에 매칭되는 tier 찾기
 * serviceMonthFrom <= months <= serviceMonthTo 인 tier 반환
 */
export function findMatchingTier(serviceMonths: number, tiers: AccrualTier[]): AccrualTier | null {
  return tiers.find(
    (tier) => serviceMonths >= tier.serviceMonthFrom && serviceMonths <= tier.serviceMonthTo,
  ) ?? null;
}

/**
 * 일할 계산 (Pro-rata)
 * 회계연도 기준 연차에서 중도 입사자의 연차를 일할 계산
 * proRata = fullDays * (잔여일수 / 총일수), 소수 첫째자리 반올림
 *
 * @param fullDays 연차 전체 일수
 * @param joinDate 입사일
 * @param fiscalStart 회계연도 시작일
 * @param fiscalEnd 회계연도 종료일
 * @returns 일할 계산된 연차 일수 (소수점 첫째자리까지)
 */
export function calculateProRata(
  fullDays: number,
  joinDate: Date,
  fiscalStart: Date,
  fiscalEnd: Date,
): number {
  const totalMs = fiscalEnd.getTime() - fiscalStart.getTime();
  if (totalMs <= 0) return 0;

  // 입사일이 회계연도 시작 이전이면 전체 일수 부여
  const effectiveStart = joinDate <= fiscalStart ? fiscalStart : joinDate;
  const remainingMs = fiscalEnd.getTime() - effectiveStart.getTime();
  if (remainingMs <= 0) return 0;

  const ratio = remainingMs / totalMs;
  const raw = fullDays * ratio;

  // 소수 첫째자리 반올림
  return Math.round(raw * 10) / 10;
}

/**
 * 법정 연차 일수 계산 (근로기준법 제60조)
 * - 1년 미만: 월별 발생이므로 이 함수에서는 0 반환
 * - 1년 이상: 기본 15일
 * - 3년 이상: 2년마다 1일 가산
 * - 최대: 25일
 *
 * @param serviceYears 근속 연수 (소수 버림한 정수)
 * @returns 법정 연차 일수
 */
export function calculateLegalAnnualLeave(serviceYears: number): number {
  if (serviceYears < 1) return 0;

  const base = 15;
  // 3년 이상부터 2년마다 1일 가산: (serviceYears - 1) / 2 의 정수부분
  const bonus = serviceYears >= 3 ? Math.floor((serviceYears - 1) / 2) : 0;

  return Math.min(base + bonus, 25);
}
