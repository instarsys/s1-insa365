/**
 * GrossPayCalculator — Phase 2 of the payroll engine.
 *
 * Calculates total gross pay (총 지급액) by combining:
 * 1. Base salary (pro-rated for mid-month join/leave)
 * 2. Fixed allowances (pro-rated)
 * 3. Premium pay (overtime, night, holiday — from PremiumCalculator or FormulaEngine)
 * 4. Variable allowances (not pro-rated)
 * 5. Minus attendance deductions
 *
 * totalPay = basePay + fixedAllowances + premiums + formulaAllowances + variableAllowances - attendanceDeductions
 */

import { SalaryItem, type SalaryItemProps } from '../entities/SalaryItem';
import type { AttendanceSummary } from '../entities/AttendanceRecord';
import { PremiumCalculator, type PremiumResult } from './PremiumCalculator';
import { FormulaEngine } from './FormulaEngine';
import type { FormulaContext } from './FormulaEngine';

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
  formulaAllowances: number;
  variableAllowances: number;
  attendanceDeductions: number;
  totalPay: number;
}

/** 레거시 키워드 목록 — 기존 DB 데이터 호환 */
const LEGACY_ALLOWANCE_KEYWORDS = new Set([
  'OVERTIME', 'NIGHT', 'NIGHT_OVERTIME',
  'HOLIDAY', 'HOLIDAY_OVERTIME',
  'HOLIDAY_NIGHT', 'HOLIDAY_NIGHT_OVERTIME',
  'WEEKLY_HOLIDAY',
]);

export function isLegacyAllowanceKeyword(formula: string | undefined): boolean {
  return !!formula && LEGACY_ALLOWANCE_KEYWORDS.has(formula);
}

/** FormulaEngine에 전달할 수당 컨텍스트 빌드 */
export function buildAllowanceContext(
  ordinaryHourlyWage: number,
  attendance: AttendanceSummary,
  hourlyRate?: number,
  basePay?: number,
): FormulaContext {
  const totalMinutes =
    attendance.regularMinutes +
    attendance.overtimeMinutes +
    attendance.nightMinutes +
    attendance.nightOvertimeMinutes +
    attendance.holidayMinutes +
    attendance.holidayOvertimeMinutes +
    attendance.holidayNightMinutes +
    attendance.holidayNightOvertimeMinutes;

  return {
    통상시급: ordinaryHourlyWage,
    기본급: basePay ?? 0,
    시급: hourlyRate ?? ordinaryHourlyWage,
    연장근로분: attendance.overtimeMinutes,
    야간근로분: attendance.nightMinutes,
    야간연장근로분: attendance.nightOvertimeMinutes,
    휴일근로분_8이내: attendance.holidayMinutes,
    휴일근로분_8초과: attendance.holidayOvertimeMinutes,
    휴일야간근로분_8이내: attendance.holidayNightMinutes,
    휴일야간근로분_8초과: attendance.holidayNightOvertimeMinutes,
    정규근로분: attendance.regularMinutes,
    총근로분: totalMinutes,
    근무일수: Math.ceil(attendance.regularMinutes / 480), // 대략적 근무일 추산 (8시간/일)
  };
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
      // 시급제 유급 휴가: 시급 × paidLeaveMinutes / 60 (근로기준법: 연차 사용 시 1일 소정근로시간 × 시급)
      if ((attendance.paidLeaveMinutes ?? 0) > 0) {
        basePay += Math.floor(hourlyRate * attendance.paidLeaveMinutes! / 60);
      }
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

    // 3. FORMULA 수당: 레거시 키워드 → PremiumCalculator, 새 수식 → FormulaEngine
    const formulaItems = items.filter((item) => item.isAllowance() && item.isFormula());
    // formula 필드가 없거나 레거시 키워드인 경우 → 레거시 경로
    const hasLegacyOnly = formulaItems.every(
      (item) => !item.formula || isLegacyAllowanceKeyword(item.formula),
    );

    let premiums: PremiumResult;
    let formulaAllowances = 0;

    if (hasLegacyOnly || formulaItems.length === 0) {
      // 레거시 호환 경로: PremiumCalculator가 모든 프리미엄 계산
      premiums = PremiumCalculator.calculate(ordinaryHourlyWage, attendance);
    } else {
      // 새 수식 엔진 경로: FORMULA 항목을 FormulaEngine으로 개별 계산
      premiums = {
        overtimePay: 0,
        nightPay: 0,
        nightOvertimePay: 0,
        holidayPay: 0,
        holidayOvertimePay: 0,
        holidayNightPay: 0,
        holidayNightOvertimePay: 0,
        totalPremium: 0,
      };

      const ctx = buildAllowanceContext(ordinaryHourlyWage, attendance, hourlyRate, basePay);

      for (const item of formulaItems) {
        if (!item.formula) continue;

        if (isLegacyAllowanceKeyword(item.formula)) {
          // 레거시 키워드인 경우 PremiumCalculator로 개별 계산
          const legacyPremiums = PremiumCalculator.calculate(ordinaryHourlyWage, attendance);
          const amount = getLegacyPremiumAmount(item.formula, legacyPremiums);
          formulaAllowances += amount;
        } else {
          // 새 수식 엔진
          const amount = FormulaEngine.evaluate(item.formula, ctx);
          formulaAllowances += amount;
        }
      }
    }

    // 4. Variable allowances: ALLOWANCE + VARIABLE type (not prorated)
    const variableAllowances = items
      .filter((item) => item.isAllowance() && item.isVariable())
      .reduce((sum, item) => sum + item.amount, 0);

    // 5. Attendance deductions: DEDUCTION items (negative adjustments)
    let attendanceDeductions = items
      .filter((item) => item.isDeduction())
      .reduce((sum, item) => sum + item.amount, 0);

    // 5-1. 월급제 결근 공제: basePay × absentDays / workDays
    if (
      salaryType === 'MONTHLY' &&
      attendance.absentDays !== undefined &&
      attendance.absentDays > 0 &&
      attendance.workDays !== undefined &&
      attendance.workDays > 0
    ) {
      const dailyPay = Math.floor(basePay / attendance.workDays);
      const absentDeduction = dailyPay * attendance.absentDays;
      attendanceDeductions += absentDeduction;
    }

    // 5-1b. 월급제 무급 휴가 공제: basePay × unpaidLeaveDays / workDays
    if (
      salaryType === 'MONTHLY' &&
      (attendance.unpaidLeaveDays ?? 0) > 0 &&
      attendance.workDays !== undefined &&
      attendance.workDays > 0
    ) {
      const dailyPay = Math.floor(basePay / attendance.workDays);
      attendanceDeductions += dailyPay * attendance.unpaidLeaveDays!;
    }

    // 5-2. 월급제 지각/조퇴 공제: ordinaryHourlyWage × (totalLateMinutes + totalEarlyLeaveMinutes) / 60
    if (
      salaryType === 'MONTHLY' &&
      ((attendance.totalLateMinutes ?? 0) > 0 || (attendance.totalEarlyLeaveMinutes ?? 0) > 0)
    ) {
      const lateEarlyMinutes = (attendance.totalLateMinutes ?? 0) + (attendance.totalEarlyLeaveMinutes ?? 0);
      const lateEarlyDeduction = Math.floor(ordinaryHourlyWage * lateEarlyMinutes / 60);
      attendanceDeductions += lateEarlyDeduction;
    }

    // Total pay = all income - attendance deductions
    const totalPay =
      basePay +
      fixedAllowances +
      premiums.totalPremium +
      formulaAllowances +
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
      formulaAllowances,
      variableAllowances,
      attendanceDeductions,
      totalPay,
    };
  }
}

/** 레거시 키워드 → PremiumResult에서 해당 금액 추출 */
function getLegacyPremiumAmount(keyword: string, premiums: PremiumResult): number {
  switch (keyword) {
    case 'OVERTIME': return premiums.overtimePay;
    case 'NIGHT': return premiums.nightPay;
    case 'NIGHT_OVERTIME': return premiums.nightOvertimePay;
    case 'HOLIDAY': return premiums.holidayPay;
    case 'HOLIDAY_OVERTIME': return premiums.holidayOvertimePay;
    case 'HOLIDAY_NIGHT': return premiums.holidayNightPay;
    case 'HOLIDAY_NIGHT_OVERTIME': return premiums.holidayNightOvertimePay;
    case 'WEEKLY_HOLIDAY': return 0; // 주휴수당은 별도 계산
    default: return 0;
  }
}
