import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { ISalaryAttendanceDataRepository } from '../../ports/ISalaryAttendanceDataRepository';
import type { IEmployeeSalaryItemRepository } from '../../ports/IEmployeeSalaryItemRepository';
import type { PayrollDetailDto, PayBreakdownItem, DeductionBreakdownItem } from '../../dtos/payroll';

function fmtKRW(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

function minutesToHours(min: number): number {
  return Math.round((min / 60) * 10) / 10;
}

export class GetPayrollDetailUseCase {
  constructor(
    private salaryCalcRepo: ISalaryCalculationRepository,
    private salaryAttendanceRepo: ISalaryAttendanceDataRepository,
    private employeeSalaryItemRepo?: IEmployeeSalaryItemRepository,
  ) {}

  async execute(companyId: string, calculationId: string): Promise<PayrollDetailDto | null> {
    // 1. SalaryCalculation 조회
    const calc = await this.salaryCalcRepo.findByIdWithDetails(companyId, calculationId);
    if (!calc) return null;

    // 2. 근태 스냅샷 조회 (Prisma raw 객체는 userId, DTO는 employeeId)
    const attendanceSnap = await this.salaryAttendanceRepo.findByEmployeeAndPeriod(
      companyId,
      calc.userId ?? calc.employeeId,
      calc.year,
      calc.month,
    );

    const ordinaryHourly = Number(calc.ordinaryWageHourly);
    const ordinaryMonthly = Number(calc.ordinaryWageMonthly);

    // 3. 지급 항목 breakdown 생성
    const payItems: PayBreakdownItem[] = [];

    // 기본급
    if (Number(calc.basePay) > 0) {
      payItems.push({
        label: '기본급',
        amount: Number(calc.basePay),
        description: calc.prorationApplied
          ? `기본급 × ${calc.prorationRatio ?? 1} (일할계산)`
          : '기본급',
      });
    }

    // 고정수당 — 개별 항목 표시
    if (this.employeeSalaryItemRepo) {
      const salaryItems = await this.employeeSalaryItemRepo.findActiveByEmployee(companyId, calc.userId ?? calc.employeeId);
      const fixedAllowanceItems = salaryItems.filter(
        (si) => si.type === 'ALLOWANCE' && si.paymentType === 'FIXED' && Number(si.amount) > 0,
      );
      for (const si of fixedAllowanceItems) {
        payItems.push({
          label: String(si.name),
          amount: Number(si.amount),
          description: String(si.name),
        });
      }
    } else if (Number(calc.fixedAllowances) > 0) {
      payItems.push({
        label: '고정수당',
        amount: Number(calc.fixedAllowances),
        description: '고정수당 합계',
      });
    }

    // 연장수당
    if (Number(calc.overtimePay) > 0) {
      const hours = attendanceSnap ? minutesToHours(attendanceSnap.totalOvertimeMinutes) : undefined;
      payItems.push({
        label: '연장수당',
        amount: Number(calc.overtimePay),
        hours,
        rate: ordinaryHourly,
        multiplier: 1.5,
        description: hours != null
          ? `${hours}h × ${fmtKRW(ordinaryHourly)} × 1.5`
          : '연장근로 수당',
      });
    }

    // 야간수당
    if (Number(calc.nightPay) > 0) {
      const hours = attendanceSnap ? minutesToHours(attendanceSnap.totalNightMinutes) : undefined;
      payItems.push({
        label: '야간수당',
        amount: Number(calc.nightPay),
        hours,
        rate: ordinaryHourly,
        multiplier: 0.5,
        description: hours != null
          ? `${hours}h × ${fmtKRW(ordinaryHourly)} × 0.5`
          : '야간근로 수당',
      });
    }

    // 야간연장수당
    if (Number(calc.nightOvertimePay) > 0) {
      const hours = attendanceSnap ? minutesToHours(attendanceSnap.totalNightOvertimeMinutes) : undefined;
      payItems.push({
        label: '야간연장수당',
        amount: Number(calc.nightOvertimePay),
        hours,
        rate: ordinaryHourly,
        multiplier: 2.0,
        description: hours != null
          ? `${hours}h × ${fmtKRW(ordinaryHourly)} × 2.0`
          : '야간+연장 수당',
      });
    }

    // 휴일수당
    if (Number(calc.holidayPay) > 0) {
      const hours = attendanceSnap ? minutesToHours(attendanceSnap.totalHolidayMinutes) : undefined;
      payItems.push({
        label: '휴일수당',
        amount: Number(calc.holidayPay),
        hours,
        rate: ordinaryHourly,
        multiplier: 1.5,
        description: hours != null
          ? `${hours}h × ${fmtKRW(ordinaryHourly)} × 1.5`
          : '휴일근로 수당',
      });
    }

    // 휴일연장수당
    if (Number(calc.holidayOvertimePay) > 0) {
      const hours = attendanceSnap ? minutesToHours(attendanceSnap.totalHolidayOvertimeMinutes) : undefined;
      payItems.push({
        label: '휴일연장수당',
        amount: Number(calc.holidayOvertimePay),
        hours,
        rate: ordinaryHourly,
        multiplier: 2.0,
        description: hours != null
          ? `${hours}h × ${fmtKRW(ordinaryHourly)} × 2.0`
          : '휴일+연장 수당',
      });
    }

    // 휴일야간수당
    if (Number(calc.holidayNightPay) > 0) {
      const hours = attendanceSnap ? minutesToHours(attendanceSnap.totalHolidayNightMinutes) : undefined;
      payItems.push({
        label: '휴일야간수당',
        amount: Number(calc.holidayNightPay),
        hours,
        rate: ordinaryHourly,
        multiplier: 2.0,
        description: hours != null
          ? `${hours}h × ${fmtKRW(ordinaryHourly)} × 2.0`
          : '휴일+야간 수당',
      });
    }

    // 휴일야간연장수당
    if (Number(calc.holidayNightOvertimePay) > 0) {
      const hours = attendanceSnap ? minutesToHours(attendanceSnap.totalHolidayNightOvertimeMinutes) : undefined;
      payItems.push({
        label: '휴일야간연장수당',
        amount: Number(calc.holidayNightOvertimePay),
        hours,
        rate: ordinaryHourly,
        multiplier: 2.5,
        description: hours != null
          ? `${hours}h × ${fmtKRW(ordinaryHourly)} × 2.5`
          : '휴일+야간+연장 수당',
      });
    }

    // 변동수당 — 개별 항목 표시 (편집 가능)
    if (this.employeeSalaryItemRepo) {
      const allItems = await this.employeeSalaryItemRepo.findActiveByEmployee(companyId, calc.userId ?? calc.employeeId);
      const variableItems = allItems.filter((si) => si.type === 'ALLOWANCE' && si.paymentType === 'VARIABLE');
      for (const si of variableItems) {
        payItems.push({
          label: si.name,
          amount: Number(si.amount),
          description: si.name,
          editable: true,
          itemCode: si.code,
        });
      }
    } else if (Number(calc.variableAllowances) > 0) {
      payItems.push({
        label: '변동수당',
        amount: Number(calc.variableAllowances),
        description: '변동수당 합계',
      });
    }

    // 근태공제 (음수로 표시)
    if (Number(calc.attendanceDeductions) > 0) {
      const absentDays = attendanceSnap?.absentDays ?? 0;
      payItems.push({
        label: '근태공제',
        amount: -Number(calc.attendanceDeductions),
        description: absentDays > 0
          ? `결근 ${absentDays}일 등 공제`
          : '근태 관련 공제',
      });
    }

    // 4. 공제 항목 breakdown 생성
    const taxableIncome = Number(calc.taxableIncome);
    const deductionItems: DeductionBreakdownItem[] = [];

    if (Number(calc.nationalPension) > 0) {
      deductionItems.push({
        label: '국민연금',
        amount: Number(calc.nationalPension),
        base: taxableIncome,
        rate: 0.045,
        description: `${fmtKRW(taxableIncome)} × 4.5% (10원미만 절사)`,
      });
    }

    if (Number(calc.healthInsurance) > 0) {
      deductionItems.push({
        label: '건강보험',
        amount: Number(calc.healthInsurance),
        base: taxableIncome,
        rate: 0.03545,
        description: `${fmtKRW(taxableIncome)} × 3.545% (1원미만 절사)`,
      });
    }

    if (Number(calc.longTermCare) > 0) {
      const healthAmount = Number(calc.healthInsurance);
      deductionItems.push({
        label: '장기요양',
        amount: Number(calc.longTermCare),
        base: healthAmount,
        rate: 0.1295,
        description: `${fmtKRW(healthAmount)} × 12.95% (1원미만 절사)`,
      });
    }

    if (Number(calc.employmentInsurance) > 0) {
      deductionItems.push({
        label: '고용보험',
        amount: Number(calc.employmentInsurance),
        base: taxableIncome,
        rate: 0.009,
        description: `${fmtKRW(taxableIncome)} × 0.9% (1원미만 절사)`,
      });
    }

    if (Number(calc.incomeTax) > 0) {
      deductionItems.push({
        label: '소득세',
        amount: Number(calc.incomeTax),
        description: '간이세액표 조회',
      });
    }

    if (Number(calc.localIncomeTax) > 0) {
      deductionItems.push({
        label: '지방소득세',
        amount: Number(calc.localIncomeTax),
        base: Number(calc.incomeTax),
        rate: 0.1,
        description: `${fmtKRW(Number(calc.incomeTax))} × 10%`,
      });
    }

    // 임의공제 (D07~D12) 개별 항목 표시
    if (this.employeeSalaryItemRepo) {
      const salaryItems = await this.employeeSalaryItemRepo.findActiveByEmployee(companyId, calc.userId ?? calc.employeeId);
      const deductionFixedItems = salaryItems.filter(
        (si) => si.type === 'DEDUCTION' && si.paymentType === 'FIXED' && Number(si.amount) > 0,
      );
      for (const si of deductionFixedItems) {
        deductionItems.push({
          label: String(si.name),
          amount: Number(si.amount),
          description: String(si.name),
        });
      }
    }

    // 5. 근태 정보 매핑
    const attendance = attendanceSnap
      ? {
          workDays: Number(attendanceSnap.workDays),
          actualWorkDays: Number(attendanceSnap.actualWorkDays),
          absentDays: Number(attendanceSnap.absentDays),
          lateDays: Number(attendanceSnap.lateDays),
          earlyLeaveDays: Number(attendanceSnap.earlyLeaveDays),
          leaveDays: Number(attendanceSnap.leaveDays),
          overtimeMinutes: Number(attendanceSnap.totalOvertimeMinutes),
          nightMinutes: Number(attendanceSnap.totalNightMinutes),
          nightOvertimeMinutes: Number(attendanceSnap.totalNightOvertimeMinutes),
          holidayMinutes: Number(attendanceSnap.totalHolidayMinutes),
          holidayOvertimeMinutes: Number(attendanceSnap.totalHolidayOvertimeMinutes),
          holidayNightMinutes: Number(attendanceSnap.totalHolidayNightMinutes),
          holidayNightOvertimeMinutes: Number(attendanceSnap.totalHolidayNightOvertimeMinutes),
          lateMinutes: Number(attendanceSnap.totalLateMinutes),
          earlyLeaveMinutes: Number(attendanceSnap.totalEarlyLeaveMinutes),
        }
      : null;

    // salaryType은 user에 있음
    const user = calc as unknown as Record<string, unknown>;
    const salaryType = (user.salaryType as string) ?? 'MONTHLY';

    return {
      employeeName: calc.employeeName,
      employeeNumber: calc.employeeNumber,
      departmentName: calc.departmentName,
      salaryType,

      ordinaryWageMonthly: ordinaryMonthly,
      ordinaryWageHourly: ordinaryHourly,

      attendance,

      payItems,
      totalPay: Number(calc.totalPay),

      totalNonTaxable: Number(calc.totalNonTaxable),
      taxableIncome,

      deductionItems,
      totalDeduction: Number(calc.totalDeduction),

      netPay: Number(calc.netPay),

      prorationApplied: calc.prorationApplied,
      prorationRatio: calc.prorationRatio,
      minimumWageWarning: calc.minimumWageWarning,
    };
  }
}
