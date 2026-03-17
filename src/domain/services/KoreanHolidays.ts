/**
 * KoreanHolidays — 연도별 한국 법정 공휴일 데이터.
 *
 * 순수 TypeScript — 외부 의존성 없음.
 * 음력 기반 공휴일(설날/추석/부처님오신날)은 매년 날짜가 다르므로 하드코딩.
 * 대체공휴일도 관보 고시 기준으로 포함.
 */

export interface HolidayEntry {
  date: string;  // "YYYY-MM-DD"
  name: string;
  isRecurring: boolean;
}

const HOLIDAYS: Record<number, HolidayEntry[]> = {
  2025: [
    { date: '2025-01-01', name: '신정', isRecurring: true },
    { date: '2025-01-28', name: '설날 연휴', isRecurring: false },
    { date: '2025-01-29', name: '설날', isRecurring: false },
    { date: '2025-01-30', name: '설날 연휴', isRecurring: false },
    { date: '2025-03-01', name: '삼일절', isRecurring: true },
    { date: '2025-03-03', name: '대체공휴일(삼일절)', isRecurring: false },
    { date: '2025-05-05', name: '어린이날', isRecurring: true },
    { date: '2025-05-06', name: '대체공휴일(부처님오신날)', isRecurring: false },
    { date: '2025-05-15', name: '부처님오신날', isRecurring: false },
    { date: '2025-06-06', name: '현충일', isRecurring: true },
    { date: '2025-08-15', name: '광복절', isRecurring: true },
    { date: '2025-10-03', name: '개천절', isRecurring: true },
    { date: '2025-10-05', name: '추석 연휴', isRecurring: false },
    { date: '2025-10-06', name: '추석', isRecurring: false },
    { date: '2025-10-07', name: '추석 연휴', isRecurring: false },
    { date: '2025-10-08', name: '대체공휴일(추석)', isRecurring: false },
    { date: '2025-10-09', name: '한글날', isRecurring: true },
    { date: '2025-12-25', name: '크리스마스', isRecurring: true },
  ],
  2026: [
    { date: '2026-01-01', name: '신정', isRecurring: true },
    { date: '2026-02-16', name: '설날 연휴', isRecurring: false },
    { date: '2026-02-17', name: '설날', isRecurring: false },
    { date: '2026-02-18', name: '설날 연휴', isRecurring: false },
    { date: '2026-03-01', name: '삼일절', isRecurring: true },
    { date: '2026-03-02', name: '대체공휴일(삼일절)', isRecurring: false },
    { date: '2026-05-05', name: '어린이날', isRecurring: true },
    { date: '2026-05-24', name: '부처님오신날', isRecurring: false },
    { date: '2026-06-06', name: '현충일', isRecurring: true },
    { date: '2026-08-15', name: '광복절', isRecurring: true },
    { date: '2026-08-17', name: '대체공휴일(광복절)', isRecurring: false },
    { date: '2026-09-24', name: '추석 연휴', isRecurring: false },
    { date: '2026-09-25', name: '추석', isRecurring: false },
    { date: '2026-09-26', name: '추석 연휴', isRecurring: false },
    { date: '2026-10-03', name: '개천절', isRecurring: true },
    { date: '2026-10-05', name: '대체공휴일(개천절)', isRecurring: false },
    { date: '2026-10-09', name: '한글날', isRecurring: true },
    { date: '2026-12-25', name: '크리스마스', isRecurring: true },
  ],
  2027: [
    { date: '2027-01-01', name: '신정', isRecurring: true },
    { date: '2027-02-06', name: '설날 연휴', isRecurring: false },
    { date: '2027-02-07', name: '설날', isRecurring: false },
    { date: '2027-02-08', name: '설날 연휴', isRecurring: false },
    { date: '2027-02-09', name: '대체공휴일(설날)', isRecurring: false },
    { date: '2027-03-01', name: '삼일절', isRecurring: true },
    { date: '2027-05-05', name: '어린이날', isRecurring: true },
    { date: '2027-05-13', name: '부처님오신날', isRecurring: false },
    { date: '2027-06-06', name: '현충일', isRecurring: true },
    { date: '2027-06-07', name: '대체공휴일(현충일)', isRecurring: false },
    { date: '2027-08-15', name: '광복절', isRecurring: true },
    { date: '2027-08-16', name: '대체공휴일(광복절)', isRecurring: false },
    { date: '2027-10-03', name: '개천절', isRecurring: true },
    { date: '2027-10-04', name: '대체공휴일(개천절)', isRecurring: false },
    { date: '2027-10-09', name: '한글날', isRecurring: true },
    { date: '2027-10-14', name: '추석 연휴', isRecurring: false },
    { date: '2027-10-15', name: '추석', isRecurring: false },
    { date: '2027-10-16', name: '추석 연휴', isRecurring: false },
    { date: '2027-12-25', name: '크리스마스', isRecurring: true },
  ],
};

/**
 * 해당 연도의 한국 법정 공휴일 목록을 반환합니다.
 * 지원하지 않는 연도는 빈 배열 반환.
 */
export function getKoreanHolidays(year: number): HolidayEntry[] {
  return HOLIDAYS[year] ?? [];
}

/**
 * 지원하는 연도 목록.
 */
export function getSupportedYears(): number[] {
  return Object.keys(HOLIDAYS).map(Number).sort();
}
