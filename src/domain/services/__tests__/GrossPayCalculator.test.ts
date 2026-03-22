import { describe, it, expect } from 'vitest';
import { GrossPayCalculator } from '../GrossPayCalculator';
import type { SalaryItemProps } from '../../entities/SalaryItem';
import type { AttendanceSummary } from '../../entities/AttendanceRecord';

const ZERO_ATTENDANCE: AttendanceSummary = {
  regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0,
  nightOvertimeMinutes: 0, holidayMinutes: 0, holidayOvertimeMinutes: 0,
  holidayNightMinutes: 0, holidayNightOvertimeMinutes: 0,
};

const BASE_SALARY: SalaryItemProps = {
  id: '1', code: 'B01', name: '기본급', type: 'BASE',
  paymentType: 'FIXED', paymentCycle: 'MONTHLY',
  amount: 3_000_000, isOrdinaryWage: true, isTaxExempt: false,
};

const FIXED_ALLOWANCE: SalaryItemProps = {
  id: '2', code: 'A01', name: '직책수당', type: 'ALLOWANCE',
  paymentType: 'FIXED', paymentCycle: 'MONTHLY',
  amount: 200_000, isOrdinaryWage: true, isTaxExempt: false,
};

const VARIABLE_ALLOWANCE: SalaryItemProps = {
  id: '3', code: 'A08', name: '성과수당', type: 'ALLOWANCE',
  paymentType: 'VARIABLE', paymentCycle: 'MONTHLY',
  amount: 500_000, isOrdinaryWage: false, isTaxExempt: false,
};

const DEDUCTION_ITEM: SalaryItemProps = {
  id: '4', code: 'D10', name: '결근공제', type: 'DEDUCTION',
  paymentType: 'FIXED', paymentCycle: 'MONTHLY',
  amount: 100_000, isOrdinaryWage: false, isTaxExempt: false,
};

describe('GrossPayCalculator', () => {
  describe('full month (no proration)', () => {
    it('should calculate basic salary with no overtime', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, FIXED_ALLOWANCE];
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 15_311, 1.0);

      expect(result.basePay).toBe(3_000_000);
      expect(result.fixedAllowances).toBe(200_000);
      expect(result.overtimePay).toBe(0);
      expect(result.variableAllowances).toBe(0);
      expect(result.attendanceDeductions).toBe(0);
      expect(result.totalPay).toBe(3_200_000);
    });

    it('should include premium pay from attendance', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        overtimeMinutes: 600, // 10 hours overtime
      };
      const hourlyWage = Math.floor(3_000_000 / 209); // 14354
      const result = GrossPayCalculator.calculate(items, attendance, hourlyWage, 1.0);

      const expectedOT = Math.floor(hourlyWage * 1.5 * 600 / 60);
      expect(result.overtimePay).toBe(expectedOT);
      expect(result.totalPay).toBe(3_000_000 + expectedOT);
    });

    it('should include variable allowances (not prorated)', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, VARIABLE_ALLOWANCE];
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, 1.0);

      expect(result.variableAllowances).toBe(500_000);
      expect(result.totalPay).toBe(3_500_000);
    });

    it('should not include SalaryItem deductions in attendanceDeductions (handled in Phase 4)', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, DEDUCTION_ITEM];
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, 1.0);

      // SalaryItem DEDUCTION은 Phase 4(DeductionCalculator)에서 처리
      // attendanceDeductions는 순수 근태 공제(결근/지각/조퇴)만 포함
      expect(result.attendanceDeductions).toBe(0);
      expect(result.totalPay).toBe(3_000_000);
    });
  });

  describe('proration', () => {
    it('should prorate base pay and fixed allowances', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, FIXED_ALLOWANCE];
      const prorationRatio = 16 / 31; // Mid-month join (16 days out of 31)
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, prorationRatio);

      expect(result.basePay).toBe(Math.floor(3_000_000 * prorationRatio));
      expect(result.fixedAllowances).toBe(Math.floor(200_000 * prorationRatio));
    });

    it('should NOT prorate variable allowances', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, VARIABLE_ALLOWANCE];
      const prorationRatio = 0.5;
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, prorationRatio);

      // Variable allowances are NOT prorated
      expect(result.variableAllowances).toBe(500_000);
      // Base is prorated
      expect(result.basePay).toBe(Math.floor(3_000_000 * 0.5));
    });

    it('should floor prorated amounts', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const prorationRatio = 16 / 31; // ~0.516129
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, prorationRatio);

      expect(Number.isInteger(result.basePay)).toBe(true);
      expect(result.basePay).toBe(Math.floor(3_000_000 * prorationRatio));
    });
  });

  describe('combined scenario', () => {
    it('should correctly combine all components', () => {
      const items: SalaryItemProps[] = [
        BASE_SALARY, FIXED_ALLOWANCE, VARIABLE_ALLOWANCE, DEDUCTION_ITEM,
      ];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        overtimeMinutes: 120,
        nightMinutes: 60,
      };
      const hourlyWage = 14_354;
      const result = GrossPayCalculator.calculate(items, attendance, hourlyWage, 1.0);

      const expectedOT = Math.floor(hourlyWage * 1.5 * 120 / 60);
      const expectedNight = Math.floor(hourlyWage * 0.5 * 60 / 60);

      // SalaryItem DEDUCTION은 Phase 4에서 처리되므로 totalPay에서 차감하지 않음
      expect(result.totalPay).toBe(
        3_000_000 +   // base
        200_000 +     // fixed allowance
        expectedOT +  // overtime
        expectedNight + // night
        500_000       // variable allowance
      );
    });
  });

  describe('hourly salary type', () => {
    it('should calculate basePay from hourlyRate × regularMinutes / 60', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 9600, // 160 hours
      };
      const items: SalaryItemProps[] = [BASE_SALARY]; // BASE item is ignored for HOURLY
      const hourlyRate = 11_000;
      const result = GrossPayCalculator.calculate(items, attendance, hourlyRate, 1.0, 'HOURLY', hourlyRate);

      // basePay = floor(11000 × 9600 / 60) = floor(1,760,000) = 1,760,000
      expect(result.basePay).toBe(Math.floor(11_000 * 9600 / 60));
      // fixedAllowances still comes from items
      expect(result.fixedAllowances).toBe(0); // BASE_SALARY is BASE type, not ALLOWANCE
    });

    it('should include overtime premium for hourly employees', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 9600,
        overtimeMinutes: 300, // 5 hours OT
      };
      const hourlyRate = 10_320;
      const result = GrossPayCalculator.calculate([], attendance, hourlyRate, 1.0, 'HOURLY', hourlyRate);

      const expectedBase = Math.floor(10_320 * 9600 / 60);
      const expectedOT = Math.floor(hourlyRate * 1.5 * 300 / 60);
      expect(result.basePay).toBe(expectedBase);
      expect(result.overtimePay).toBe(expectedOT);
      expect(result.totalPay).toBe(expectedBase + expectedOT);
    });

    it('should handle zero regularMinutes for hourly employee', () => {
      const attendance: AttendanceSummary = { ...ZERO_ATTENDANCE, regularMinutes: 0 };
      const result = GrossPayCalculator.calculate([], attendance, 11_000, 1.0, 'HOURLY', 11_000);

      expect(result.basePay).toBe(0);
      expect(result.totalPay).toBe(0);
    });
  });

  describe('absent deduction (월급제 결근 공제)', () => {
    it('should deduct basePay/workDays × absentDays for monthly salary', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 9600, // 160h worked
        absentDays: 2,
        workDays: 22,
      };
      const result = GrossPayCalculator.calculate(items, attendance, 15_311, 1.0);

      // dailyPay = floor(3,000,000 / 22) = 136,363
      // absentDeduction = 136,363 × 2 = 272,726
      const dailyPay = Math.floor(3_000_000 / 22);
      expect(result.attendanceDeductions).toBe(dailyPay * 2);
      expect(result.totalPay).toBe(3_000_000 - dailyPay * 2);
    });

    it('should not deduct when absentDays is 0', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 10560, // 176h
        absentDays: 0,
        workDays: 22,
      };
      const result = GrossPayCalculator.calculate(items, attendance, 15_311, 1.0);

      expect(result.attendanceDeductions).toBe(0);
    });

    it('should not deduct absent days for HOURLY salary type', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 9600,
        absentDays: 2,
        workDays: 22,
      };
      const result = GrossPayCalculator.calculate([], attendance, 11_000, 1.0, 'HOURLY', 11_000);

      // HOURLY: 결근 공제 미적용 (시급제는 일한 시간만 지급)
      expect(result.attendanceDeductions).toBe(0);
    });
  });

  describe('late/early leave deduction (지각/조퇴 공제)', () => {
    it('should deduct ordinaryHourlyWage × lateMinutes / 60 for late', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 10560,
        totalLateMinutes: 30,
        workDays: 22,
      };
      const result = GrossPayCalculator.calculate(items, attendance, 15_311, 1.0);

      // deduction = floor(15,311 × 30 / 60) = floor(7,655.5) = 7,655
      const expected = Math.floor(15_311 * 30 / 60);
      expect(result.attendanceDeductions).toBe(expected);
    });

    it('should deduct ordinaryHourlyWage × earlyLeaveMinutes / 60 for early leave', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 10560,
        totalEarlyLeaveMinutes: 120,
        workDays: 22,
      };
      const result = GrossPayCalculator.calculate(items, attendance, 15_311, 1.0);

      // deduction = floor(15,311 × 120 / 60) = floor(30,622) = 30,622
      const expected = Math.floor(15_311 * 120 / 60);
      expect(result.attendanceDeductions).toBe(expected);
    });

    it('should combine late + early leave minutes for deduction', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 10560,
        totalLateMinutes: 30,
        totalEarlyLeaveMinutes: 60,
        workDays: 22,
      };
      const result = GrossPayCalculator.calculate(items, attendance, 15_311, 1.0);

      // deduction = floor(15,311 × 90 / 60) = floor(22,966.5) = 22,966
      const expected = Math.floor(15_311 * 90 / 60);
      expect(result.attendanceDeductions).toBe(expected);
    });

    it('should not deduct late/early leave for HOURLY salary type', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 9600,
        totalLateMinutes: 30,
        totalEarlyLeaveMinutes: 60,
        workDays: 22,
      };
      const result = GrossPayCalculator.calculate([], attendance, 11_000, 1.0, 'HOURLY', 11_000);

      // HOURLY: 지각/조퇴 공제 미적용
      expect(result.attendanceDeductions).toBe(0);
    });
  });

  describe('leave pay (유급/무급 휴가 처리)', () => {
    it('월급제 + 유급 휴가 → 공제 없음 (basePay 변동 없음)', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 9120, // 152h (20일-2일 유급 = 18일 실출근 × 8h)
        workDays: 22,
        absentDays: 0,
        paidLeaveDays: 2,
        unpaidLeaveDays: 0,
        paidLeaveMinutes: 960, // 16h
      };
      const result = GrossPayCalculator.calculate(items, attendance, 15_311, 1.0);

      // 월급제는 유급 휴가에 대한 별도 공제/추가 없음
      expect(result.basePay).toBe(3_000_000);
      expect(result.attendanceDeductions).toBe(0);
      expect(result.totalPay).toBe(3_000_000);
    });

    it('월급제 + 무급 휴가 2일 → dailyPay × 2 공제', () => {
      const items: SalaryItemProps[] = [BASE_SALARY];
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 9120,
        workDays: 22,
        absentDays: 0,
        paidLeaveDays: 0,
        unpaidLeaveDays: 2,
        paidLeaveMinutes: 0,
      };
      const result = GrossPayCalculator.calculate(items, attendance, 15_311, 1.0);

      const dailyPay = Math.floor(3_000_000 / 22);
      expect(result.attendanceDeductions).toBe(dailyPay * 2);
      expect(result.totalPay).toBe(3_000_000 - dailyPay * 2);
    });

    it('시급제 + 유급 휴가 → paidLeaveMinutes로 보전', () => {
      const hourlyRate = 10_320;
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 9120, // 152h 실근무
        paidLeaveDays: 1,
        unpaidLeaveDays: 0,
        paidLeaveMinutes: 480, // 8h 유급 보전
      };
      const result = GrossPayCalculator.calculate([], attendance, hourlyRate, 1.0, 'HOURLY', hourlyRate);

      // basePay = floor(10320 × 9120 / 60) + floor(10320 × 480 / 60)
      const regularPay = Math.floor(hourlyRate * 9120 / 60);
      const leavePay = Math.floor(hourlyRate * 480 / 60);
      expect(result.basePay).toBe(regularPay + leavePay);
      expect(result.attendanceDeductions).toBe(0);
    });

    it('시급제 + 무급 휴가 2일 → 별도 공제 없음 (자연 감소)', () => {
      const hourlyRate = 10_320;
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        regularMinutes: 8640, // 144h (출근 안 한 시간만큼 자연 감소)
        paidLeaveDays: 0,
        unpaidLeaveDays: 2,
        paidLeaveMinutes: 0,
      };
      const result = GrossPayCalculator.calculate([], attendance, hourlyRate, 1.0, 'HOURLY', hourlyRate);

      // 시급제: 실근무 시간 기반 → 무급 휴가 공제 로직 불필요
      expect(result.basePay).toBe(Math.floor(hourlyRate * 8640 / 60));
      expect(result.attendanceDeductions).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty salary items', () => {
      const result = GrossPayCalculator.calculate([], ZERO_ATTENDANCE, 14_354, 1.0);

      expect(result.totalPay).toBe(0);
    });

    it('should handle zero proration ratio', () => {
      const items: SalaryItemProps[] = [BASE_SALARY, FIXED_ALLOWANCE];
      const result = GrossPayCalculator.calculate(items, ZERO_ATTENDANCE, 14_354, 0);

      expect(result.basePay).toBe(0);
      expect(result.fixedAllowances).toBe(0);
    });
  });
});
