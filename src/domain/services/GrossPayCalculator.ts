/**
 * GrossPayCalculator — Phase 2 of the payroll engine.
 *
 * Calculates total gross pay (총 지급액) by combining:
 * 1. Base salary (pro-rated for mid-month join/leave)
 * 2. Fixed allowances (pro-rated)
 * 3. Premium pay (overtime, night, holiday — from PremiumCalculator)
 * 4. Variable allowances (not pro-rated)
 * 5. Minus attendance deductions
 *
 * totalPay = basePay + fixedAllowances + premiums + variableAllowances - attendanceDeductions
 */

import { SalaryItem, type SalaryItemProps } from '../entities/SalaryItem';
import type { AttendanceSummary } from '../entities/AttendanceRecord';
import { PremiumCalculator, type PremiumResult } from './PremiumCalculator';

export interface GrossPayResult {
  basePay: number;
  fixedAllowances: number;
  overtimePay: number;
  nightPay: number;
  nightOvertimePay: number;
  holidayPay: number;
  holidayOvertimePay: number;
  holidayNightPay: number;
  holidayNightOvertimePay: number;
  variableAllowances: number;
  attendanceDeductions: number;
  totalPay: number;
}

export class GrossPayCalculator {
  /**
   * Calculate gross pay.
   * @param salaryItemProps All salary items for this employee
   * @param attendance Monthly attendance summary
   * @param ordinaryHourlyWage Hourly ordinary wage (from Phase 1)
   * @param prorationRatio Proration ratio (1.0 = full month)
   * @param salaryType MONTHLY or HOURLY (default MONTHLY)
   * @param hourlyRate Hourly rate for HOURLY employees
   */
  static calculate(
    salaryItemProps: SalaryItemProps[],
    attendance: AttendanceSummary,
    ordinaryHourlyWage: number,
    prorationRatio: number,
    salaryType: 'MONTHLY' | 'HOURLY' = 'MONTHLY',
    hourlyRate?: number,
  ): GrossPayResult {
    const items = salaryItemProps.map((p) => new SalaryItem(p));

    // 1. Base salary
    let basePay: number;
    if (salaryType === 'HOURLY' && hourlyRate !== undefined) {
      // 시급제: hourlyRate × regularMinutes / 60
      basePay = Math.floor(hourlyRate * attendance.regularMinutes / 60);
    } else {
      // 월급제: sum of BASE type items, prorated
      basePay = Math.floor(
        items
          .filter((item) => item.isBase())
          .reduce((sum, item) => sum + item.amount, 0) * prorationRatio,
      );
    }

    // 2. Fixed allowances: ALLOWANCE + FIXED type, prorated
    const fixedAllowances = Math.floor(
      items
        .filter((item) => item.isAllowance() && item.isFixed())
        .reduce((sum, item) => sum + item.amount, 0) * prorationRatio,
    );

    // 3. Premium pay from attendance (overtime, night, holiday)
    const premiums: PremiumResult = PremiumCalculator.calculate(
      ordinaryHourlyWage,
      attendance,
    );

    // 4. Variable allowances: ALLOWANCE + VARIABLE type (not prorated)
    const variableAllowances = items
      .filter((item) => item.isAllowance() && item.isVariable())
      .reduce((sum, item) => sum + item.amount, 0);

    // 5. Attendance deductions: DEDUCTION items (negative adjustments)
    //    Note: formula-based deductions are typically handled here
    const attendanceDeductions = items
      .filter((item) => item.isDeduction())
      .reduce((sum, item) => sum + item.amount, 0);

    // Total pay = all income - attendance deductions
    const totalPay =
      basePay +
      fixedAllowances +
      premiums.totalPremium +
      variableAllowances -
      attendanceDeductions;

    return {
      basePay,
      fixedAllowances,
      overtimePay: premiums.overtimePay,
      nightPay: premiums.nightPay,
      nightOvertimePay: premiums.nightOvertimePay,
      holidayPay: premiums.holidayPay,
      holidayOvertimePay: premiums.holidayOvertimePay,
      holidayNightPay: premiums.holidayNightPay,
      holidayNightOvertimePay: premiums.holidayNightOvertimePay,
      variableAllowances,
      attendanceDeductions,
      totalPay,
    };
  }
}
