/**
 * ProrationCalculator — calculates mid-month join/leave proration ratio.
 *
 * When an employee joins or leaves mid-month, their fixed salary components
 * (base pay, fixed allowances) are prorated based on the number of days
 * actually worked vs. total days in the month.
 *
 * Two methods:
 * - CALENDAR_DAY: worked calendar days / total calendar days in month
 * - WORKING_DAY: worked working days / total working days in month
 *
 * If the employee works the full month, ratio = 1.0 (no proration).
 */

export interface ProrationResult {
  /** Proration ratio (0-1). 1.0 means full month, no proration. */
  ratio: number;
  /** Whether proration was applied */
  applied: boolean;
  /** Number of days the employee worked */
  workedDays: number;
  /** Total days in the period */
  totalDays: number;
}

export class ProrationCalculator {
  /**
   * Calculate the proration ratio for a given month.
   * @param year Payroll year
   * @param month Payroll month (1-12)
   * @param joinDate Employee's join date
   * @param resignDate Employee's resign date (if applicable)
   * @param method Proration method: CALENDAR_DAY or WORKING_DAY
   * @param holidays List of holiday dates for WORKING_DAY method
   */
  static calculate(
    year: number,
    month: number,
    joinDate: Date,
    resignDate?: Date,
    method: 'CALENDAR_DAY' | 'WORKING_DAY' = 'CALENDAR_DAY',
    holidays: Date[] = [],
  ): ProrationResult {
    const monthStart = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = new Date(year, month - 1, lastDay);

    // Determine effective start and end within the month
    const effectiveStart = joinDate > monthStart ? joinDate : monthStart;
    const effectiveEnd =
      resignDate && resignDate < monthEnd ? resignDate : monthEnd;

    // If effective dates cover the full month, no proration
    const isFullMonth =
      effectiveStart.getFullYear() === monthStart.getFullYear() &&
      effectiveStart.getMonth() === monthStart.getMonth() &&
      effectiveStart.getDate() === 1 &&
      effectiveEnd.getFullYear() === monthEnd.getFullYear() &&
      effectiveEnd.getMonth() === monthEnd.getMonth() &&
      effectiveEnd.getDate() === lastDay;

    if (isFullMonth) {
      return { ratio: 1.0, applied: false, workedDays: lastDay, totalDays: lastDay };
    }

    if (method === 'CALENDAR_DAY') {
      return ProrationCalculator.calendarDayProration(
        effectiveStart,
        effectiveEnd,
        monthStart,
        monthEnd,
      );
    }

    return ProrationCalculator.workingDayProration(
      effectiveStart,
      effectiveEnd,
      monthStart,
      monthEnd,
      holidays,
    );
  }

  private static calendarDayProration(
    start: Date,
    end: Date,
    monthStart: Date,
    monthEnd: Date,
  ): ProrationResult {
    const totalDays = ProrationCalculator.daysBetween(monthStart, monthEnd) + 1;
    const workedDays = ProrationCalculator.daysBetween(start, end) + 1;
    const ratio = totalDays > 0 ? workedDays / totalDays : 0;

    return { ratio, applied: true, workedDays, totalDays };
  }

  private static workingDayProration(
    start: Date,
    end: Date,
    monthStart: Date,
    monthEnd: Date,
    holidays: Date[],
  ): ProrationResult {
    const totalDays = ProrationCalculator.countWorkingDays(monthStart, monthEnd, holidays);
    const workedDays = ProrationCalculator.countWorkingDays(start, end, holidays);
    const ratio = totalDays > 0 ? workedDays / totalDays : 0;

    return { ratio, applied: true, workedDays, totalDays };
  }

  private static daysBetween(start: Date, end: Date): number {
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000));
  }

  private static countWorkingDays(
    start: Date,
    end: Date,
    holidays: Date[],
  ): number {
    const holidaySet = new Set(
      holidays.map((h) => {
        const d = new Date(h.getFullYear(), h.getMonth(), h.getDate());
        return d.getTime();
      }),
    );

    let count = 0;
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endNorm = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (current <= endNorm) {
      const dayOfWeek = current.getDay();
      const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
      const isHoliday = holidaySet.has(current.getTime());
      if (isWeekday && !isHoliday) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }
}
