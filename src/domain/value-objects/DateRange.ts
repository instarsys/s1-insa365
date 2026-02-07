/**
 * DateRange value object — represents an inclusive date range [start, end].
 *
 * Used for insurance rate effective periods, attendance periods,
 * proration calculations, etc.
 */
export class DateRange {
  private readonly _start: Date;
  private readonly _end: Date;

  constructor(start: Date, end: Date) {
    if (start > end) {
      throw new Error('DateRange start must not be after end');
    }
    // Normalize to midnight (date only, no time component)
    this._start = DateRange.toMidnight(start);
    this._end = DateRange.toMidnight(end);
  }

  get start(): Date {
    return new Date(this._start);
  }

  get end(): Date {
    return new Date(this._end);
  }

  /** Check if a date falls within this range (inclusive) */
  includes(date: Date): boolean {
    const d = DateRange.toMidnight(date);
    return d >= this._start && d <= this._end;
  }

  /** Check if this range overlaps with another range */
  overlaps(other: DateRange): boolean {
    return this._start <= other._end && this._end >= other._start;
  }

  /** Get the number of calendar days (inclusive of both start and end) */
  getDays(): number {
    const ms = this._end.getTime() - this._start.getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
  }

  /**
   * Get the number of working days (Mon-Fri), excluding provided holidays.
   * @param holidays Array of holiday dates to exclude
   */
  getWorkingDays(holidays?: Date[]): number {
    const holidaySet = new Set(
      (holidays ?? []).map((h) => DateRange.toMidnight(h).getTime()),
    );

    let count = 0;
    const current = new Date(this._start);
    while (current <= this._end) {
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

  equals(other: DateRange): boolean {
    return (
      this._start.getTime() === other._start.getTime() &&
      this._end.getTime() === other._end.getTime()
    );
  }

  private static toMidnight(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
