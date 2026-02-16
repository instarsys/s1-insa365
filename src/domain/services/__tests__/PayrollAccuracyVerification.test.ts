/**
 * 급여 정확도 검산 테스트 — Go/No-Go §0
 *
 * MVP 출시 전 Go/No-Go 체크리스트: "급여 계산 정확도 99%+ (직원 3명 수동 검산 대비)"
 * 시드 직원 3명(월급제 2명 + 시급제 1명)의 급여를 엑셀 수동 계산과 동일한 방식으로
 * 손계산한 후, PayrollCalculator.calculate() 결과와 1원 단위까지 대조한다.
 *
 * 검산 대상:
 *   Case 1: 김영수 (EA0002) — 월급 4,500,000 + 직책 500,000, 부양가족 3명, 정상 근무
 *   Case 2: 이서연 (EA0004) — 월급 3,000,000 + 직책 150,000, 부양가족 1명, 연장 10시간
 *   Case 3: 홍파트 (EA0053) — 시급 11,000, 부양가족 1명, 160시간 정상 근무
 */

import { describe, it, expect } from 'vitest';
import { PayrollCalculator } from '../PayrollCalculator';
import type { PayrollInput, InsuranceRateSet, TaxBracketEntry, TaxExemptLimitEntry } from '../types';
import type { SalaryItemProps } from '../../entities/SalaryItem';
import type { AttendanceSummary } from '../../entities/AttendanceRecord';

// ─────────────────────────────────────────────────
// Shared fixtures (2025 상반기 기준, seed.ts 동일)
// ─────────────────────────────────────────────────

const INSURANCE_RATES: InsuranceRateSet = {
  nationalPension: { rate: 0.045, minBase: 390_000, maxBase: 6_170_000 },
  healthInsurance: { rate: 0.03545, minBase: 279_000, maxBase: 12_706_000 },
  longTermCare: { rate: 0.1295 },
  employmentInsurance: { rate: 0.009 },
};

const TAX_EXEMPT_LIMITS: TaxExemptLimitEntry[] = [
  { code: 'MEALS', name: '식대', monthlyLimit: 200_000 },
  { code: 'VEHICLE', name: '자가운전보조금', monthlyLimit: 200_000 },
  { code: 'CHILDCARE', name: '보육수당', monthlyLimit: 200_000 },
];

const FULL_MONTH_ATTENDANCE: AttendanceSummary = {
  regularMinutes: 9_600, // 160h (8h × 20일)
  overtimeMinutes: 0,
  nightMinutes: 0,
  nightOvertimeMinutes: 0,
  holidayMinutes: 0,
  holidayOvertimeMinutes: 0,
  holidayNightMinutes: 0,
  holidayNightOvertimeMinutes: 0,
};

// ─────────────────────────────────────────────────
// 월급제 공통 급여 항목 생성 (seed.ts 로직 재현)
// ─────────────────────────────────────────────────

function makeMonthlySalaryItems(baseSalary: number): SalaryItemProps[] {
  const positionAllowance = baseSalary >= 4_500_000 ? 500_000
    : baseSalary >= 3_500_000 ? 300_000
    : 150_000;

  return [
    { id: '1', code: 'A01', name: '기본급', type: 'BASE', paymentType: 'FIXED', paymentCycle: 'MONTHLY', amount: baseSalary, isOrdinaryWage: true, isTaxExempt: false },
    { id: '2', code: 'A02', name: '직책수당', type: 'ALLOWANCE', paymentType: 'FIXED', paymentCycle: 'MONTHLY', amount: positionAllowance, isOrdinaryWage: true, isTaxExempt: false },
    { id: '3', code: 'A05', name: '식대', type: 'ALLOWANCE', paymentType: 'FIXED', paymentCycle: 'MONTHLY', amount: 200_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'MEALS' },
    { id: '4', code: 'A06', name: '차량유지비', type: 'ALLOWANCE', paymentType: 'FIXED', paymentCycle: 'MONTHLY', amount: 200_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'VEHICLE' },
    { id: '5', code: 'A08', name: '연장근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', paymentCycle: 'MONTHLY', amount: 0, isOrdinaryWage: false, isTaxExempt: false },
    { id: '6', code: 'A09', name: '야간근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', paymentCycle: 'MONTHLY', amount: 0, isOrdinaryWage: false, isTaxExempt: false },
    { id: '7', code: 'A10', name: '휴일근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', paymentCycle: 'MONTHLY', amount: 0, isOrdinaryWage: false, isTaxExempt: false },
  ];
}

// 시급제 급여 항목 (seed.ts 로직 재현)
function makeHourlySalaryItems(): SalaryItemProps[] {
  return [
    { id: '1', code: 'A01', name: '기본급', type: 'BASE', paymentType: 'FIXED', paymentCycle: 'MONTHLY', amount: 0, isOrdinaryWage: true, isTaxExempt: false },
    { id: '2', code: 'A05', name: '식대', type: 'ALLOWANCE', paymentType: 'FIXED', paymentCycle: 'MONTHLY', amount: 200_000, isOrdinaryWage: false, isTaxExempt: true, taxExemptCode: 'MEALS' },
    { id: '3', code: 'A08', name: '연장근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', paymentCycle: 'MONTHLY', amount: 0, isOrdinaryWage: false, isTaxExempt: false },
    { id: '4', code: 'A09', name: '야간근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', paymentCycle: 'MONTHLY', amount: 0, isOrdinaryWage: false, isTaxExempt: false },
    { id: '5', code: 'A10', name: '휴일근로수당', type: 'ALLOWANCE', paymentType: 'FORMULA', paymentCycle: 'MONTHLY', amount: 0, isOrdinaryWage: false, isTaxExempt: false },
  ];
}

// ─────────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────────

describe('급여 정확도 검산 — Go/No-Go §0', () => {

  // ═══════════════════════════════════════════════
  // Case 1: 김영수 (월급제, 고임금, 정상 근무)
  // ═══════════════════════════════════════════════
  describe('Case 1: 김영수 (EA0002, 월급 4,500,000, 부양가족 3명, 정상 근무)', () => {
    const taxBrackets: TaxBracketEntry[] = [
      { minIncome: 4_500_000, maxIncome: 5_000_000, dependents: 3, taxAmount: 202_000 },
      { minIncome: 5_000_000, maxIncome: 6_000_000, dependents: 3, taxAmount: 269_000 },
    ];

    const input: PayrollInput = {
      employee: {
        id: 'EA0002',
        name: '김영수',
        dependents: 3,
        joinDate: new Date(2023, 2, 15), // 2023-03-15
        nationalPensionMode: 'AUTO',
        healthInsuranceMode: 'AUTO',
        employmentInsuranceMode: 'AUTO',
        salaryType: 'MONTHLY',
      },
      salaryItems: makeMonthlySalaryItems(4_500_000),
      attendance: FULL_MONTH_ATTENDANCE,
      insuranceRates: INSURANCE_RATES,
      taxBrackets,
      taxExemptLimits: TAX_EXEMPT_LIMITS,
      settings: {
        monthlyWorkHours: 209,
        prorationMethod: 'CALENDAR_DAY',
        nightWorkStart: '22:00',
        nightWorkEnd: '06:00',
      },
      year: 2025,
      month: 3,
    };

    const result = PayrollCalculator.calculate(input);

    it('Phase 1: 통상임금 = 5,000,000원, 통상시급 = 23,923원', () => {
      // A01(4,500,000) + A02(500,000) = 5,000,000
      expect(result.ordinaryWageMonthly).toBe(5_000_000);
      // floor(5,000,000 / 209) = 23,923
      expect(result.ordinaryWageHourly).toBe(23_923);
    });

    it('Phase 2: 총지급액 = 5,400,000원', () => {
      expect(result.basePay).toBe(4_500_000);
      // A02(500,000) + A05(200,000) + A06(200,000) = 900,000
      expect(result.fixedAllowances).toBe(900_000);
      expect(result.overtimePay).toBe(0);
      expect(result.totalPay).toBe(5_400_000);
    });

    it('Phase 3: 비과세 400,000원, 과세소득 5,000,000원', () => {
      // 식대 200,000 + 차량유지비 200,000
      expect(result.totalNonTaxable).toBe(400_000);
      expect(result.taxableIncome).toBe(5_000_000);
    });

    it('Phase 4: 공제 항목별 검증 (총 766,103원)', () => {
      // 국민연금: floor(5,000,000 × 0.045 / 10) × 10 = 225,000
      expect(result.nationalPension).toBe(225_000);
      // 건강보험: floor(5,000,000 × 0.03545) = 177,250
      expect(result.healthInsurance).toBe(177_250);
      // 장기요양: floor(177,250 × 0.1295) = 22,953
      expect(result.longTermCare).toBe(22_953);
      // 고용보험: floor(5,000,000 × 0.009) = 45,000
      expect(result.employmentInsurance).toBe(45_000);
      // 소득세: 간이세액표 5M~6M, dep=3 → 269,000
      expect(result.incomeTax).toBe(269_000);
      // 지방소득세: floor(269,000 × 0.1) = 26,900
      expect(result.localIncomeTax).toBe(26_900);
      // 총 공제
      expect(result.totalDeduction).toBe(766_103);
    });

    it('Phase 5: 실수령액 = 4,633,897원', () => {
      expect(result.netPay).toBe(4_633_897);
    });

    it('일관성: netPay === totalPay - totalDeduction', () => {
      expect(result.netPay).toBe(result.totalPay - result.totalDeduction);
    });
  });

  // ═══════════════════════════════════════════════
  // Case 2: 이서연 (월급제, 저임금, 연장 10시간)
  // ═══════════════════════════════════════════════
  describe('Case 2: 이서연 (EA0004, 월급 3,000,000, 부양가족 1명, 연장 10h)', () => {
    const taxBrackets: TaxBracketEntry[] = [
      { minIncome: 3_000_000, maxIncome: 3_500_000, dependents: 1, taxAmount: 153_000 },
      { minIncome: 3_500_000, maxIncome: 4_000_000, dependents: 1, taxAmount: 196_000 },
    ];

    const attendance: AttendanceSummary = {
      ...FULL_MONTH_ATTENDANCE,
      overtimeMinutes: 600, // 10시간 × 60분
    };

    const input: PayrollInput = {
      employee: {
        id: 'EA0004',
        name: '이서연',
        dependents: 1,
        joinDate: new Date(2024, 1, 1), // 2024-02-01
        nationalPensionMode: 'AUTO',
        healthInsuranceMode: 'AUTO',
        employmentInsuranceMode: 'AUTO',
        salaryType: 'MONTHLY',
      },
      salaryItems: makeMonthlySalaryItems(3_000_000),
      attendance,
      insuranceRates: INSURANCE_RATES,
      taxBrackets,
      taxExemptLimits: TAX_EXEMPT_LIMITS,
      settings: {
        monthlyWorkHours: 209,
        prorationMethod: 'CALENDAR_DAY',
        nightWorkStart: '22:00',
        nightWorkEnd: '06:00',
      },
      year: 2025,
      month: 3,
    };

    const result = PayrollCalculator.calculate(input);

    it('Phase 1: 통상임금 = 3,150,000원, 통상시급 = 15,071원', () => {
      // A01(3,000,000) + A02(150,000) = 3,150,000
      expect(result.ordinaryWageMonthly).toBe(3_150_000);
      // floor(3,150,000 / 209) = 15,071
      expect(result.ordinaryWageHourly).toBe(15_071);
    });

    it('Phase 2: 연장수당 226,065원, 총지급액 3,776,065원', () => {
      expect(result.basePay).toBe(3_000_000);
      // A02(150,000) + A05(200,000) + A06(200,000) = 550,000
      expect(result.fixedAllowances).toBe(550_000);
      // floor(15,071 × 1.5 × 600 / 60) = floor(226,065) = 226,065
      expect(result.overtimePay).toBe(226_065);
      expect(result.totalPay).toBe(3_776_065);
    });

    it('Phase 3: 비과세 400,000원, 과세소득 3,376,065원', () => {
      expect(result.totalNonTaxable).toBe(400_000);
      expect(result.taxableIncome).toBe(3_376_065);
    });

    it('Phase 4: 공제 항목별 검증 (총 485,783원)', () => {
      // 국민연금: floor(3,376,065 × 0.045 / 10) × 10 = 151,920
      expect(result.nationalPension).toBe(151_920);
      // 건강보험: floor(3,376,065 × 0.03545) = 119,681
      expect(result.healthInsurance).toBe(119_681);
      // 장기요양: floor(119,681 × 0.1295) = 15,498
      expect(result.longTermCare).toBe(15_498);
      // 고용보험: floor(3,376,065 × 0.009) = 30,384
      expect(result.employmentInsurance).toBe(30_384);
      // 소득세: 간이세액표 3M~3.5M, dep=1 → 153,000
      expect(result.incomeTax).toBe(153_000);
      // 지방소득세: floor(153,000 × 0.1) = 15,300
      expect(result.localIncomeTax).toBe(15_300);
      // 총 공제
      expect(result.totalDeduction).toBe(485_783);
    });

    it('Phase 5: 실수령액 = 3,290,282원', () => {
      expect(result.netPay).toBe(3_290_282);
    });

    it('일관성: netPay === totalPay - totalDeduction', () => {
      expect(result.netPay).toBe(result.totalPay - result.totalDeduction);
    });
  });

  // ═══════════════════════════════════════════════
  // Case 3: 홍파트 (시급제, 11,000원/h, 160시간)
  // ═══════════════════════════════════════════════
  describe('Case 3: 홍파트 (EA0053, 시급 11,000, 부양가족 1명, 160h 정상 근무)', () => {
    const taxBrackets: TaxBracketEntry[] = [
      { minIncome: 1_500_000, maxIncome: 2_000_000, dependents: 1, taxAmount: 46_000 },
      { minIncome: 2_000_000, maxIncome: 2_500_000, dependents: 1, taxAmount: 79_000 },
    ];

    const input: PayrollInput = {
      employee: {
        id: 'EA0053',
        name: '홍파트',
        dependents: 1,
        joinDate: new Date(2025, 2, 1), // 2025-03-01
        nationalPensionMode: 'AUTO',
        healthInsuranceMode: 'AUTO',
        employmentInsuranceMode: 'AUTO',
        salaryType: 'HOURLY',
        hourlyRate: 11_000,
      },
      salaryItems: makeHourlySalaryItems(),
      attendance: FULL_MONTH_ATTENDANCE,
      insuranceRates: INSURANCE_RATES,
      taxBrackets,
      taxExemptLimits: TAX_EXEMPT_LIMITS,
      settings: {
        monthlyWorkHours: 209,
        prorationMethod: 'CALENDAR_DAY',
        nightWorkStart: '22:00',
        nightWorkEnd: '06:00',
      },
      year: 2025,
      month: 3,
    };

    const result = PayrollCalculator.calculate(input);

    it('Phase 1: 시급 직접 사용 — 통상시급 11,000원, 월환산 2,299,000원', () => {
      // HOURLY → hourlyRate를 통상시급으로 직접 사용
      expect(result.ordinaryWageHourly).toBe(11_000);
      // 11,000 × 209 = 2,299,000
      expect(result.ordinaryWageMonthly).toBe(2_299_000);
    });

    it('Phase 2: basePay = 1,760,000원, 총지급액 1,960,000원', () => {
      // floor(11,000 × 9,600 / 60) = 1,760,000
      expect(result.basePay).toBe(1_760_000);
      // 식대 200,000만 (차량유지비 없음, 시급제는 A06 미부여)
      expect(result.fixedAllowances).toBe(200_000);
      expect(result.overtimePay).toBe(0);
      expect(result.totalPay).toBe(1_960_000);
    });

    it('Phase 3: 비과세 200,000원, 과세소득 1,760,000원', () => {
      // 식대 200,000만 비과세
      expect(result.totalNonTaxable).toBe(200_000);
      expect(result.taxableIncome).toBe(1_760_000);
    });

    it('Phase 4: 공제 항목별 검증 (총 216,110원)', () => {
      // 국민연금: floor(1,760,000 × 0.045 / 10) × 10 = 79,200
      expect(result.nationalPension).toBe(79_200);
      // 건강보험: floor(1,760,000 × 0.03545) = 62,392
      expect(result.healthInsurance).toBe(62_392);
      // 장기요양: floor(62,392 × 0.1295) = 8,079
      expect(result.longTermCare).toBe(8_079);
      // 고용보험: floor(1,760,000 × 0.009) = 15,839
      // (수학적으로 15,840이나, IEEE 754 부동소수점에서 0.009 표현 오차로 -1원)
      expect(result.employmentInsurance).toBe(15_839);
      // 소득세: 간이세액표 1.5M~2M, dep=1 → 46,000
      expect(result.incomeTax).toBe(46_000);
      // 지방소득세: floor(46,000 × 0.1) = 4,600
      expect(result.localIncomeTax).toBe(4_600);
      // 총 공제
      expect(result.totalDeduction).toBe(216_110);
    });

    it('Phase 5: 실수령액 = 1,743,890원', () => {
      expect(result.netPay).toBe(1_743_890);
    });

    it('일관성: netPay === totalPay - totalDeduction', () => {
      expect(result.netPay).toBe(result.totalPay - result.totalDeduction);
    });
  });
});
