/**
 * AttendanceRecord — attendance summary for payroll calculation.
 *
 * This is a read model that represents the aggregated work time
 * classified by segment type (regular, overtime, night, holiday, etc.).
 * Data originates from AttendanceSegment records after attendance confirmation.
 *
 * All time values are in minutes for precision.
 *
 * Premium multipliers (applied by PremiumCalculator):
 * - Regular: 1.0x (no premium)
 * - Overtime: 1.5x ordinary hourly wage
 * - Night (22:00-06:00): additional 0.5x
 * - Night + Overtime: 2.0x
 * - Holiday (within 8h): 1.5x
 * - Holiday (over 8h): 2.0x
 * - Holiday + Night (within 8h): 2.0x
 * - Holiday + Night (over 8h): 2.5x
 */

export interface AttendanceSummary {
  /** Regular work minutes (정규 근무) */
  regularMinutes: number;
  /** Overtime minutes (연장 근무, exceeds 8h/day or 40h/week) */
  overtimeMinutes: number;
  /** Night work minutes (야간 근무, 22:00-06:00) */
  nightMinutes: number;
  /** Night + overtime overlap minutes (야간+연장) */
  nightOvertimeMinutes: number;
  /** Holiday work minutes within 8h (휴일 근무 <=8h) */
  holidayMinutes: number;
  /** Holiday work minutes over 8h (휴일 연장 근무 >8h) */
  holidayOvertimeMinutes: number;
  /** Holiday + night work within 8h (휴일+야간 <=8h) */
  holidayNightMinutes: number;
  /** Holiday + night + overtime over 8h (휴일+야간 >8h) */
  holidayNightOvertimeMinutes: number;
}

export class AttendanceRecord {
  readonly regularMinutes: number;
  readonly overtimeMinutes: number;
  readonly nightMinutes: number;
  readonly nightOvertimeMinutes: number;
  readonly holidayMinutes: number;
  readonly holidayOvertimeMinutes: number;
  readonly holidayNightMinutes: number;
  readonly holidayNightOvertimeMinutes: number;

  constructor(summary: AttendanceSummary) {
    this.regularMinutes = summary.regularMinutes;
    this.overtimeMinutes = summary.overtimeMinutes;
    this.nightMinutes = summary.nightMinutes;
    this.nightOvertimeMinutes = summary.nightOvertimeMinutes;
    this.holidayMinutes = summary.holidayMinutes;
    this.holidayOvertimeMinutes = summary.holidayOvertimeMinutes;
    this.holidayNightMinutes = summary.holidayNightMinutes;
    this.holidayNightOvertimeMinutes = summary.holidayNightOvertimeMinutes;
  }

  /** Total minutes worked across all categories */
  getTotalMinutes(): number {
    return (
      this.regularMinutes +
      this.overtimeMinutes +
      this.nightMinutes +
      this.nightOvertimeMinutes +
      this.holidayMinutes +
      this.holidayOvertimeMinutes +
      this.holidayNightMinutes +
      this.holidayNightOvertimeMinutes
    );
  }

  /** Total premium-eligible minutes (everything except regular) */
  getPremiumMinutes(): number {
    return this.getTotalMinutes() - this.regularMinutes;
  }

  /** Create an empty attendance record (no work) */
  static empty(): AttendanceRecord {
    return new AttendanceRecord({
      regularMinutes: 0,
      overtimeMinutes: 0,
      nightMinutes: 0,
      nightOvertimeMinutes: 0,
      holidayMinutes: 0,
      holidayOvertimeMinutes: 0,
      holidayNightMinutes: 0,
      holidayNightOvertimeMinutes: 0,
    });
  }

  toSummary(): AttendanceSummary {
    return {
      regularMinutes: this.regularMinutes,
      overtimeMinutes: this.overtimeMinutes,
      nightMinutes: this.nightMinutes,
      nightOvertimeMinutes: this.nightOvertimeMinutes,
      holidayMinutes: this.holidayMinutes,
      holidayOvertimeMinutes: this.holidayOvertimeMinutes,
      holidayNightMinutes: this.holidayNightMinutes,
      holidayNightOvertimeMinutes: this.holidayNightOvertimeMinutes,
    };
  }
}
