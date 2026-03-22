import { isWorkDay } from './AttendanceClassifier';

/**
 * 기간 내 근무일 수를 계산합니다 (주말 + 회사 휴일 제외).
 * @param startDate 시작일
 * @param endDate 종료일
 * @param workDays WorkPolicy의 workDays (예: "1,2,3,4,5")
 * @param holidayDates 회사 휴일 Set (YYYY-MM-DD 문자열)
 */
export function countWorkDaysInRange(
  startDate: Date,
  endDate: Date,
  workDays: string,
  holidayDates: Set<string> = new Set(),
): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

    if (isWorkDay(current, workDays) && !holidayDates.has(dateStr)) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}
