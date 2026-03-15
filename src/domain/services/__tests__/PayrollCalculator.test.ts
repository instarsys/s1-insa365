import { describe, it, expect } from 'vitest';
import { PayrollCalculator } from '../PayrollCalculator';
import type { PayrollInput } from '../types';
import type { SalaryItemProps } from '../../entities/SalaryItem';
import type { AttendanceSummary } from '../../entities/AttendanceRecord';

// --- Shared fixtures ---

const ZERO_ATTENDANCE: AttendanceSummary = {
  regularMinutes: 9600, overtimeMinutes: 0, nightMinutes: 0,
  nightOvertimeMinutes: 0, holidayMinutes: 0, holidayOvertimeMinutes: 0,
  holidayNightMinutes: 0, holidayNightOvertimeMinutes: 0,
};

const BASE_SALARY_ITEM: SalaryItemProps = {
  id: '1', code: 'B01', name: '기본급', type: 'BASE',
  paymentType: 'FIXED', paymentCycle: 'MONTHLY',
  amount: 3_000_000, isOrdinaryWage: true, isTaxExempt: false,
};

const MEALS_ITEM: SalaryItemProps = {
  id: '2', code: 'A03', name: '식대', type: 'ALLOWANCE',
  paymentType: 'FIXED', paymentCycle: 'MONTHLY',
  amount: 200_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'MEALS',
};

const POSITION_ALLOWANCE: SalaryItemProps = {
  id: '3', code: 'A01', name: '직책수당', type: 'ALLOWANCE',
  paymentType: 'FIXED', paymentCycle: 'MONTHLY',
  amount: 200_000, isOrdinaryWage: true, isTaxExempt: false,
};

function makeInput(overrides: Partial<PayrollInput> = {}): PayrollInput {
  return {
    employee: {
      id: 'emp-001',
      name: '김철수',
      dependents: 1,
      joinDate: new Date(2024, 0, 1), // Joined well before calculation month
      nationalPensionMode: 'AUTO',
      healthInsuranceMode: 'AUTO',
      employmentInsuranceMode: 'AUTO',
      salaryType: 'MONTHLY',
    },
    salaryItems: [BASE_SALARY_ITEM],
    attendance: ZERO_ATTENDANCE,
    insuranceRates: {
      nationalPension: { rate: 0.045, minBase: 390_000, maxBase: 6_170_000 },
      healthInsurance: { rate: 0.03545, minBase: 279_000, maxBase: 12_706_000 },
      longTermCare: { rate: 0.1295 },
      employmentInsurance: { rate: 0.009 },
    },
    taxBrackets: [
      { minIncome: 2_500_000, maxIncome: 3_000_000, dependents: 1, taxAmount: 105_430 },
      { minIncome: 3_000_000, maxIncome: 3_500_000, dependents: 1, taxAmount: 155_940 },
    ],
    taxExemptLimits: [
      { code: 'MEALS', name: '식대', monthlyLimit: 200_000 },
      { code: 'VEHICLE', name: '자가운전보조금', monthlyLimit: 200_000 },
      { code: 'CHILDCARE', name: '보육수당', monthlyLimit: 200_000 },
    ],
    settings: {
      monthlyWorkHours: 209,
      prorationMethod: 'CALENDAR_DAY',
      nightWorkStart: '22:00',
      nightWorkEnd: '06:00',
    },
    year: 2025,
    month: 3,
    ...overrides,
  };
}

describe('PayrollCalculator', () => {
  describe('basic salaried employee (no overtime)', () => {
    it('should calculate full pipeline for 3M base salary', () => {
      const input = makeInput();
      const result = PayrollCalculator.calculate(input);

      // Phase 1: Ordinary wage
      expect(result.ordinaryWageMonthly).toBe(3_000_000);
      expect(result.ordinaryWageHourly).toBe(Math.floor(3_000_000 / 209)); // 14354

      // Phase 2: Gross pay
      expect(result.basePay).toBe(3_000_000);
      expect(result.totalPay).toBe(3_000_000);

      // Phase 3: No tax-exempt items in this test
      expect(result.totalNonTaxable).toBe(0);
      expect(result.taxableIncome).toBe(3_000_000);

      // Phase 4: Deductions
      expect(result.nationalPension).toBe(135_000);
      expect(result.healthInsurance).toBe(Math.floor(3_000_000 * 0.03545));
      expect(result.longTermCare).toBe(Math.floor(result.healthInsurance * 0.1295));
      expect(result.employmentInsurance).toBe(Math.floor(3_000_000 * 0.009));
      expect(result.incomeTax).toBe(155_940);
      expect(result.localIncomeTax).toBe(Math.floor(155_940 * 0.1));

      // Phase 5: Net pay
      expect(result.netPay).toBe(result.totalPay - result.totalDeduction);

      // Metadata
      expect(result.status).toBe('DRAFT');
      expect(result.prorationApplied).toBe(false);
      expect(result.employeeId).toBe('emp-001');
    });
  });

  describe('with tax-exempt items', () => {
    it('should reduce taxable income by non-taxable amounts', () => {
      const input = makeInput({
        salaryItems: [BASE_SALARY_ITEM, MEALS_ITEM],
      });
      const result = PayrollCalculator.calculate(input);

      // Gross: 3,000,000 + 200,000 = 3,200,000
      expect(result.totalPay).toBe(3_200_000);

      // Meals 200,000 is non-taxable
      expect(result.totalNonTaxable).toBe(200_000);
      expect(result.taxableIncome).toBe(3_000_000);
    });
  });

  describe('with overtime', () => {
    it('should calculate overtime premium pay', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        overtimeMinutes: 600, // 10 hours
      };
      const input = makeInput({ attendance });
      const result = PayrollCalculator.calculate(input);

      const hourlyWage = Math.floor(3_000_000 / 209);
      const expectedOT = Math.floor(hourlyWage * 1.5 * 600 / 60);

      expect(result.overtimePay).toBe(expectedOT);
      expect(result.totalPay).toBe(3_000_000 + expectedOT);
    });
  });

  describe('with compound premiums', () => {
    it('should calculate holiday+night premium at 2.5x', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        holidayMinutes: 480,           // 8h holiday (1.5x)
        holidayOvertimeMinutes: 120,   // 2h holiday OT (2.0x)
        holidayNightOvertimeMinutes: 60, // 1h holiday+night+OT (2.5x)
      };
      const input = makeInput({ attendance });
      const result = PayrollCalculator.calculate(input);

      const hw = Math.floor(3_000_000 / 209);
      expect(result.holidayPay).toBe(Math.floor(hw * 1.5 * 480 / 60));
      expect(result.holidayOvertimePay).toBe(Math.floor(hw * 2.0 * 120 / 60));
      expect(result.holidayNightOvertimePay).toBe(Math.floor(hw * 2.5 * 60 / 60));
    });
  });

  describe('proration (mid-month join)', () => {
    it('should prorate for employee joining mid-month', () => {
      const input = makeInput({
        employee: {
          id: 'emp-new',
          name: '신입사원',
          dependents: 1,
          joinDate: new Date(2025, 2, 16), // Joined March 16
          nationalPensionMode: 'AUTO',
          healthInsuranceMode: 'AUTO',
          employmentInsuranceMode: 'AUTO',
          salaryType: 'MONTHLY',
        },
      });
      const result = PayrollCalculator.calculate(input);

      expect(result.prorationApplied).toBe(true);
      // 16 days out of 31
      expect(result.prorationRatio).toBeCloseTo(16 / 31, 10);
      expect(result.basePay).toBe(Math.floor(3_000_000 * 16 / 31));
    });
  });

  describe('insurance modes', () => {
    it('should handle NONE mode for all insurances', () => {
      const input = makeInput({
        employee: {
          id: 'emp-none',
          name: '보험미가입',
          dependents: 1,
          joinDate: new Date(2024, 0, 1),
          nationalPensionMode: 'NONE',
          healthInsuranceMode: 'NONE',
          employmentInsuranceMode: 'NONE',
          salaryType: 'MONTHLY',
        },
      });
      const result = PayrollCalculator.calculate(input);

      expect(result.nationalPension).toBe(0);
      expect(result.healthInsurance).toBe(0);
      expect(result.longTermCare).toBe(0);
      expect(result.employmentInsurance).toBe(0);
    });

    it('should handle MANUAL mode for pension', () => {
      const input = makeInput({
        employee: {
          id: 'emp-manual',
          name: '수동기준',
          dependents: 1,
          joinDate: new Date(2024, 0, 1),
          nationalPensionMode: 'MANUAL',
          healthInsuranceMode: 'AUTO',
          employmentInsuranceMode: 'AUTO',
          manualNationalPensionBase: 2_000_000,
          salaryType: 'MONTHLY',
        },
      });
      const result = PayrollCalculator.calculate(input);

      // Manual base 2,000,000 * 0.045 = 90,000
      expect(result.nationalPension).toBe(90_000);
    });
  });

  describe('ordinary wage with multiple items', () => {
    it('should include position allowance in ordinary wage', () => {
      const input = makeInput({
        salaryItems: [BASE_SALARY_ITEM, POSITION_ALLOWANCE, MEALS_ITEM],
      });
      const result = PayrollCalculator.calculate(input);

      // Ordinary wage: base 3M + position 200K = 3.2M (meals not ordinary)
      expect(result.ordinaryWageMonthly).toBe(3_200_000);
      expect(result.ordinaryWageHourly).toBe(Math.floor(3_200_000 / 209));
    });
  });

  describe('net pay calculation', () => {
    it('should compute netPay = totalPay - totalDeduction', () => {
      const input = makeInput();
      const result = PayrollCalculator.calculate(input);

      expect(result.netPay).toBe(result.totalPay - result.totalDeduction);
      expect(result.netPay).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty salary items (deductions from insurance minimums)', () => {
      const input = makeInput({ salaryItems: [] });
      const result = PayrollCalculator.calculate(input);

      // Empty items is valid, produces zero gross pay
      expect(result.status).toBe('DRAFT');
      expect(result.totalPay).toBe(0);
      // But insurance minimums still apply, so deductions > 0, net < 0
      expect(result.totalDeduction).toBeGreaterThan(0);
      expect(result.netPay).toBe(result.totalPay - result.totalDeduction);
    });
  });

  describe('hourly employee integration', () => {
    it('should calculate full pipeline for hourly employee', () => {
      const attendance: AttendanceSummary = {
        regularMinutes: 9600, // 160h
        overtimeMinutes: 300,  // 5h
        nightMinutes: 0,
        nightOvertimeMinutes: 0,
        holidayMinutes: 0,
        holidayOvertimeMinutes: 0,
        holidayNightMinutes: 0,
        holidayNightOvertimeMinutes: 0,
      };

      const input = makeInput({
        employee: {
          id: 'emp-hourly',
          name: '시급직원',
          dependents: 1,
          joinDate: new Date(2025, 2, 1),
          nationalPensionMode: 'AUTO',
          healthInsuranceMode: 'AUTO',
          employmentInsuranceMode: 'AUTO',
          salaryType: 'HOURLY',
          hourlyRate: 11_000,
        },
        salaryItems: [MEALS_ITEM], // No BASE item, just meals (tax-exempt)
        attendance,
      });
      const result = PayrollCalculator.calculate(input);

      // Phase 1: Ordinary wage = hourlyRate directly
      expect(result.ordinaryWageHourly).toBe(11_000);
      expect(result.ordinaryWageMonthly).toBe(11_000 * 209); // 2,299,000

      // Phase 2: basePay = 11000 × 9600/60 = 1,760,000
      expect(result.basePay).toBe(Math.floor(11_000 * 9600 / 60));
      // Overtime: 11000 × 1.5 × 300/60 = 82,500
      const expectedOT = Math.floor(11_000 * 1.5 * 300 / 60);
      expect(result.overtimePay).toBe(expectedOT);
      // totalPay = basePay + meals(200K) + overtime
      expect(result.totalPay).toBe(result.basePay + 200_000 + expectedOT);

      // Phase 3: Meals is non-taxable
      expect(result.totalNonTaxable).toBe(200_000);

      // Phase 5: Net pay
      expect(result.netPay).toBe(result.totalPay - result.totalDeduction);
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('full realistic scenario', () => {
    it('should handle complete payroll for typical office worker', () => {
      const attendance: AttendanceSummary = {
        regularMinutes: 9600, // 160h regular
        overtimeMinutes: 300,  // 5h overtime
        nightMinutes: 0,
        nightOvertimeMinutes: 0,
        holidayMinutes: 0,
        holidayOvertimeMinutes: 0,
        holidayNightMinutes: 0,
        holidayNightOvertimeMinutes: 0,
      };

      const input = makeInput({
        salaryItems: [BASE_SALARY_ITEM, POSITION_ALLOWANCE, MEALS_ITEM],
        attendance,
        taxBrackets: [
          { minIncome: 2_500_000, maxIncome: 3_000_000, dependents: 1, taxAmount: 105_430 },
          { minIncome: 3_000_000, maxIncome: 3_500_000, dependents: 1, taxAmount: 155_940 },
          { minIncome: 3_500_000, maxIncome: 4_000_000, dependents: 1, taxAmount: 190_960 },
        ],
      });

      const result = PayrollCalculator.calculate(input);

      // Phase 1: Ordinary wage = base(3M) + position(200K) = 3.2M
      expect(result.ordinaryWageMonthly).toBe(3_200_000);
      const hourlyWage = Math.floor(3_200_000 / 209); // 15311
      expect(result.ordinaryWageHourly).toBe(hourlyWage);

      // Phase 2: Gross pay
      const expectedOT = Math.floor(hourlyWage * 1.5 * 300 / 60);
      expect(result.basePay).toBe(3_000_000);
      // Both position(200K) and meals(200K) are ALLOWANCE+FIXED → 400K
      expect(result.fixedAllowances).toBe(400_000);
      expect(result.overtimePay).toBe(expectedOT);
      expect(result.totalPay).toBe(3_000_000 + 400_000 + expectedOT);

      // Phase 3: Meals 200K is tax-exempt
      expect(result.totalNonTaxable).toBe(200_000);
      expect(result.taxableIncome).toBe(result.totalPay - 200_000);

      // Phase 5: Net pay should be positive
      expect(result.netPay).toBeGreaterThan(0);
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('Scenario A: non-standard work policy (monthlyWorkHours=174)', () => {
    it('should calculate higher hourly wage with shorter monthly hours', () => {
      const input = makeInput({
        settings: {
          monthlyWorkHours: 174, // 주35시간 파트타임
          prorationMethod: 'CALENDAR_DAY',
          nightWorkStart: '22:00',
          nightWorkEnd: '06:00',
        },
      });
      const result = PayrollCalculator.calculate(input);

      // 3,000,000 / 174 = 17,241 (vs 209시간: 14,354)
      expect(result.ordinaryWageHourly).toBe(Math.floor(3_000_000 / 174));
      expect(result.ordinaryWageHourly).toBe(17_241);
      expect(result.ordinaryWageMonthly).toBe(3_000_000);
    });

    it('should produce higher overtime pay with shorter monthly hours', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        overtimeMinutes: 600, // 10h
      };
      const input174 = makeInput({
        attendance,
        settings: {
          monthlyWorkHours: 174,
          prorationMethod: 'CALENDAR_DAY',
          nightWorkStart: '22:00',
          nightWorkEnd: '06:00',
        },
      });
      const input209 = makeInput({ attendance });

      const result174 = PayrollCalculator.calculate(input174);
      const result209 = PayrollCalculator.calculate(input209);

      // 174시간 기준이 더 높은 시급 → 더 높은 연장수당
      expect(result174.overtimePay).toBeGreaterThan(result209.overtimePay);
      expect(result174.overtimePay).toBe(Math.floor(Math.floor(3_000_000 / 174) * 1.5 * 600 / 60));
    });
  });

  describe('Scenario B: hourly employee with compound premiums', () => {
    it('should calculate all premium types for hourly employee', () => {
      const attendance: AttendanceSummary = {
        regularMinutes: 9600,       // 160h
        overtimeMinutes: 600,       // 10h
        nightMinutes: 120,          // 2h
        nightOvertimeMinutes: 0,
        holidayMinutes: 480,        // 8h (≤8h → 1.5x)
        holidayOvertimeMinutes: 0,
        holidayNightMinutes: 0,
        holidayNightOvertimeMinutes: 0,
      };

      const input = makeInput({
        employee: {
          id: 'emp-hourly-b',
          name: '시급테스트',
          dependents: 1,
          joinDate: new Date(2025, 0, 1),
          nationalPensionMode: 'AUTO',
          healthInsuranceMode: 'AUTO',
          employmentInsuranceMode: 'AUTO',
          salaryType: 'HOURLY',
          hourlyRate: 11_000,
        },
        salaryItems: [],
        attendance,
      });
      const result = PayrollCalculator.calculate(input);

      // 시급제: ordinaryHourlyWage = hourlyRate
      expect(result.ordinaryWageHourly).toBe(11_000);

      // basePay = 11000 × 9600/60 = 1,760,000
      expect(result.basePay).toBe(Math.floor(11_000 * 9600 / 60));

      // overtime = 11000 × 1.5 × 600/60 = 165,000
      expect(result.overtimePay).toBe(Math.floor(11_000 * 1.5 * 600 / 60));

      // night = 11000 × 0.5 × 120/60 = 11,000
      expect(result.nightPay).toBe(Math.floor(11_000 * 0.5 * 120 / 60));

      // holiday(≤8h) = 11000 × 1.5 × 480/60 = 132,000
      expect(result.holidayPay).toBe(Math.floor(11_000 * 1.5 * 480 / 60));

      // totalPay = basePay + overtime + night + holiday
      expect(result.totalPay).toBe(
        result.basePay + result.overtimePay + result.nightPay + result.holidayPay,
      );
    });
  });

  describe('Scenario C: monthly employee with late/early leave deductions', () => {
    it('should deduct for late and early leave minutes', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        totalLateMinutes: 60,           // 1시간 지각
        totalEarlyLeaveMinutes: 120,    // 2시간 조퇴
      };

      const input = makeInput({ attendance });
      const result = PayrollCalculator.calculate(input);

      const hourlyWage = Math.floor(3_000_000 / 209);
      const expectedDeduction = Math.floor(hourlyWage * (60 + 120) / 60);

      expect(result.attendanceDeductions).toBe(expectedDeduction);
      expect(result.totalPay).toBe(3_000_000 - expectedDeduction);
    });

    it('should not deduct for hourly employee late/early leave', () => {
      const attendance: AttendanceSummary = {
        regularMinutes: 9600,
        overtimeMinutes: 0,
        nightMinutes: 0,
        nightOvertimeMinutes: 0,
        holidayMinutes: 0,
        holidayOvertimeMinutes: 0,
        holidayNightMinutes: 0,
        holidayNightOvertimeMinutes: 0,
        totalLateMinutes: 60,
        totalEarlyLeaveMinutes: 120,
      };

      const input = makeInput({
        employee: {
          id: 'emp-hourly-c',
          name: '시급지각',
          dependents: 1,
          joinDate: new Date(2025, 0, 1),
          nationalPensionMode: 'AUTO',
          healthInsuranceMode: 'AUTO',
          employmentInsuranceMode: 'AUTO',
          salaryType: 'HOURLY',
          hourlyRate: 11_000,
        },
        salaryItems: [],
        attendance,
      });
      const result = PayrollCalculator.calculate(input);

      // 시급제는 지각/조퇴 공제 없음 (근무시간으로 이미 반영)
      expect(result.attendanceDeductions).toBe(0);
    });
  });

  describe('Scenario D: mid-month join proration', () => {
    it('should prorate basePay and fixedAllowances for March 15 join', () => {
      const input = makeInput({
        employee: {
          id: 'emp-mid-month',
          name: '중도입사',
          dependents: 1,
          joinDate: new Date(2025, 2, 15), // March 15
          nationalPensionMode: 'AUTO',
          healthInsuranceMode: 'AUTO',
          employmentInsuranceMode: 'AUTO',
          salaryType: 'MONTHLY',
        },
        salaryItems: [BASE_SALARY_ITEM, POSITION_ALLOWANCE],
      });
      const result = PayrollCalculator.calculate(input);

      // March has 31 days, joined on 15th → 17 days remaining (15~31)
      const ratio = 17 / 31;
      expect(result.prorationApplied).toBe(true);
      expect(result.prorationRatio).toBeCloseTo(ratio, 10);

      // basePay pro-rated
      expect(result.basePay).toBe(Math.floor(3_000_000 * ratio));

      // fixedAllowances (position 200K) also pro-rated
      expect(result.fixedAllowances).toBe(Math.floor(200_000 * ratio));

      // totalPay = prorated basePay + prorated fixed
      expect(result.totalPay).toBe(result.basePay + result.fixedAllowances);
    });
  });

  describe('Scenario E: custom night work hours in settings', () => {
    it('should accept non-standard night work settings', () => {
      const input = makeInput({
        settings: {
          monthlyWorkHours: 209,
          prorationMethod: 'CALENDAR_DAY',
          nightWorkStart: '20:00',
          nightWorkEnd: '04:00',
        },
      });
      const result = PayrollCalculator.calculate(input);

      // PayrollCalculator uses pre-classified attendance minutes
      // (AttendanceClassifier determines night minutes based on nightWorkStart/End upstream)
      // Calculator itself just processes the numbers
      expect(result.status).toBe('DRAFT');
      expect(result.ordinaryWageHourly).toBe(Math.floor(3_000_000 / 209));
    });

    it('should correctly calculate night premium from pre-classified attendance', () => {
      const attendance: AttendanceSummary = {
        ...ZERO_ATTENDANCE,
        nightMinutes: 240, // 4h night (classified by AttendanceClassifier with custom night window)
      };

      const input = makeInput({
        attendance,
        settings: {
          monthlyWorkHours: 209,
          prorationMethod: 'CALENDAR_DAY',
          nightWorkStart: '20:00',
          nightWorkEnd: '04:00',
        },
      });
      const result = PayrollCalculator.calculate(input);

      const hourlyWage = Math.floor(3_000_000 / 209);
      expect(result.nightPay).toBe(Math.floor(hourlyWage * 0.5 * 240 / 60));
    });
  });
});
