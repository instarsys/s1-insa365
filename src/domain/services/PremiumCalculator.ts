/**
 * PremiumCalculator — calculates overtime/night/holiday work premiums.
 *
 * All premiums are based on the ordinary hourly wage (통상시급).
 * Korean labor law premium multipliers:
 *
 * | Type                          | Multiplier | Basis               |
 * |-------------------------------|-----------|---------------------|
 * | Overtime (연장)                | 1.5x      | ordinaryHourlyWage  |
 * | Night (야간, 22:00-06:00)      | 0.5x      | ordinaryHourlyWage  |
 * | Night + Overtime (야간+연장)    | 2.0x      | ordinaryHourlyWage  |
 * | Holiday <=8h (휴일)            | 1.5x      | ordinaryHourlyWage  |
 * | Holiday >8h (휴일 연장)        | 2.0x      | ordinaryHourlyWage  |
 * | Holiday + Night <=8h          | 2.0x      | ordinaryHourlyWage  |
 * | Holiday + Night >8h           | 2.5x      | ordinaryHourlyWage  |
 *
 * All results are Math.floor'd (Korean payroll convention — truncate fractional won).
 */

import type { AttendanceSummary } from '../entities/AttendanceRecord';

export interface PremiumResult {
  overtimePay: number;
  nightPay: number;
  nightOvertimePay: number;
  holidayPay: number;
  holidayOvertimePay: number;
  holidayNightPay: number;
  holidayNightOvertimePay: number;
  totalPremium: number;
}

export class PremiumCalculator {
  /**
   * Calculate all premium pay amounts.
   * @param ordinaryHourlyWage The ordinary hourly wage (통상시급) in KRW
   * @param attendance Attendance summary with minutes per category
   */
  static calculate(
    ordinaryHourlyWage: number,
    attendance: AttendanceSummary,
  ): PremiumResult {
    const overtimePay = Math.floor(
      ordinaryHourlyWage * 1.5 * attendance.overtimeMinutes / 60,
    );

    const nightPay = Math.floor(
      ordinaryHourlyWage * 0.5 * attendance.nightMinutes / 60,
    );

    const nightOvertimePay = Math.floor(
      ordinaryHourlyWage * 2.0 * attendance.nightOvertimeMinutes / 60,
    );

    const holidayPay = Math.floor(
      ordinaryHourlyWage * 1.5 * attendance.holidayMinutes / 60,
    );

    const holidayOvertimePay = Math.floor(
      ordinaryHourlyWage * 2.0 * attendance.holidayOvertimeMinutes / 60,
    );

    const holidayNightPay = Math.floor(
      ordinaryHourlyWage * 2.0 * attendance.holidayNightMinutes / 60,
    );

    const holidayNightOvertimePay = Math.floor(
      ordinaryHourlyWage * 2.5 * attendance.holidayNightOvertimeMinutes / 60,
    );

    const totalPremium =
      overtimePay +
      nightPay +
      nightOvertimePay +
      holidayPay +
      holidayOvertimePay +
      holidayNightPay +
      holidayNightOvertimePay;

    return {
      overtimePay,
      nightPay,
      nightOvertimePay,
      holidayPay,
      holidayOvertimePay,
      holidayNightPay,
      holidayNightOvertimePay,
      totalPremium,
    };
  }
}
