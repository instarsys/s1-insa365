/**
 * WorkHours value object — represents work time in minutes.
 *
 * Used for attendance tracking and premium calculations.
 * Stored as minutes internally for precision (avoids floating point issues).
 */
export class WorkHours {
  private constructor(private readonly _totalMinutes: number) {
    if (_totalMinutes < 0) {
      throw new Error('WorkHours cannot be negative');
    }
  }

  get totalMinutes(): number {
    return this._totalMinutes;
  }

  /** Convert to whole hours (floored) */
  toHours(): number {
    return Math.floor(this._totalMinutes / 60);
  }

  /** Convert to decimal hours for display (e.g., 90 min = 1.5h) */
  toDecimalHours(): number {
    return this._totalMinutes / 60;
  }

  static fromMinutes(minutes: number): WorkHours {
    return new WorkHours(minutes);
  }

  static fromHours(hours: number): WorkHours {
    return new WorkHours(Math.floor(hours * 60));
  }

  static zero(): WorkHours {
    return new WorkHours(0);
  }

  add(other: WorkHours): WorkHours {
    return new WorkHours(this._totalMinutes + other._totalMinutes);
  }

  subtract(other: WorkHours): WorkHours {
    return new WorkHours(Math.max(0, this._totalMinutes - other._totalMinutes));
  }

  isZero(): boolean {
    return this._totalMinutes === 0;
  }

  equals(other: WorkHours): boolean {
    return this._totalMinutes === other._totalMinutes;
  }
}
