import type { ISalaryCalculationRepository, CreateSalaryCalculationData } from '../../ports/ISalaryCalculationRepository';
import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { IEmployeeSalaryItemRepository } from '../../ports/IEmployeeSalaryItemRepository';
import type { ISalaryAttendanceDataRepository } from '../../ports/ISalaryAttendanceDataRepository';
import type { IInsuranceRateRepository } from '../../ports/IInsuranceRateRepository';
import type { ITaxBracketRepository } from '../../ports/ITaxBracketRepository';
import type { ITaxExemptLimitRepository } from '../../ports/ITaxExemptLimitRepository';
import type { ICompanyRepository } from '../../ports/ICompanyRepository';
import type { IWorkPolicyRepository } from '../../ports/IWorkPolicyRepository';
import type { PayrollResultDto } from '../../dtos/payroll';
import type {
  PayrollInput,
  PayrollResult,
  InsuranceRateSet,
  TaxBracketEntry,
  TaxExemptLimitEntry,
  PayrollSettings,
} from '@domain/services/types';
import type { SalaryItemProps } from '@domain/entities';
import type { AttendanceSummary } from '@domain/entities';
import { ValidationError } from '@domain/errors';

/**
 * Port for the domain PayrollCalculator service.
 * Injected at construction time to keep application layer decoupled from
 * the specific calculator implementation.
 */
export interface IPayrollCalculatorService {
  calculate(input: PayrollInput): PayrollResult;
}

export class CalculatePayrollUseCase {
  constructor(
    private salaryCalcRepo: ISalaryCalculationRepository,
    private employeeRepo: IEmployeeRepository,
    private employeeSalaryItemRepo: IEmployeeSalaryItemRepository,
    private salaryAttendanceRepo: ISalaryAttendanceDataRepository,
    private insuranceRateRepo: IInsuranceRateRepository,
    private taxBracketRepo: ITaxBracketRepository,
    private taxExemptLimitRepo: ITaxExemptLimitRepository,
    private companyRepo: ICompanyRepository,
    private payrollCalculator: IPayrollCalculatorService,
    private workPolicyRepo: IWorkPolicyRepository,
  ) {}

  async execute(companyId: string, year: number, month: number, payrollGroupId?: string): Promise<PayrollResultDto[]> {
    // Check if payroll already exists for this period
    const existing = await this.salaryCalcRepo.findByPeriod(companyId, year, month);

    // Load all active employees (with optional payrollGroup filter)
    const activeEmployees = await this.employeeRepo.findAll(companyId, {
      status: 'ACTIVE',
      page: 1,
      limit: 10000,
      ...(payrollGroupId && { payrollGroupId }),
    });

    // 퇴사 월 직원도 포함 (당월 1일 이후 퇴사자 → 일할계산 대상)
    const monthStart = new Date(year, month - 1, 1);
    const resignedInMonth = await this.employeeRepo.findAll(companyId, {
      status: 'RESIGNED',
      resignDateFrom: monthStart,
      page: 1,
      limit: 10000,
      ...(payrollGroupId && { payrollGroupId }),
    });

    const employees = {
      items: [...activeEmployees.items, ...resignedInMonth.items],
      total: activeEmployees.total + resignedInMonth.total,
      page: 1,
      limit: 10000,
    };
    const targetUserIds = employees.items.map((e) => e.id);

    if (existing.length > 0) {
      // payrollGroupId가 있으면 해당 그룹 직원의 확정 여부만 확인
      const targetExisting = payrollGroupId
        ? existing.filter((e) => targetUserIds.includes(e.employeeId))
        : existing;
      const hasConfirmed = targetExisting.some((e) => e.status === 'CONFIRMED' || e.status === 'PAID');
      if (hasConfirmed) {
        throw new ValidationError('해당 기간의 급여가 이미 확정되었습니다. 확정 취소 후 다시 계산해주세요.');
      }
    }

    // Delete non-confirmed records (그룹별 시 해당 직원만, 전체 시 전체)
    if (payrollGroupId && targetUserIds.length > 0) {
      await this.salaryCalcRepo.deleteByPeriodAndUserIds(companyId, year, month, targetUserIds);
    } else {
      await this.salaryCalcRepo.deleteByPeriod(companyId, year, month);
    }

    // Load company settings
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new ValidationError('회사 정보를 찾을 수 없습니다.');
    }

    // Load all WorkPolicies + default for per-employee settings
    const allPolicies = await this.workPolicyRepo.findAll(companyId);
    const policyMap = new Map(allPolicies.map(p => [p.id, p]));
    const defaultPolicy = allPolicies.find(p => p.isDefault);

    // Load insurance rates for the calculation date (15th of the pay month)
    const rateDate = new Date(year, month - 1, 15);
    const allRates = await this.insuranceRateRepo.findAllByDate(rateDate);
    const insuranceRates = this.buildInsuranceRateSet(allRates);

    // Load tax brackets
    const taxBrackets = await this.taxBracketRepo.findAllByYear(year);
    const taxBracketEntries: TaxBracketEntry[] = taxBrackets.map((tb) => ({
      minIncome: Number(tb.minIncome),
      maxIncome: Number(tb.maxIncome),
      dependents: tb.dependents,
      taxAmount: Number(tb.taxAmount),
    }));

    // Load tax exempt limits
    const taxExemptLimits = await this.taxExemptLimitRepo.findByYear(year);
    const taxExemptEntries: TaxExemptLimitEntry[] = taxExemptLimits.map((tel) => ({
      code: tel.code,
      name: tel.name,
      monthlyLimit: Number(tel.monthlyLimit),
    }));

    // Load attendance snapshots for the period
    const attendanceData = await this.salaryAttendanceRepo.findByPeriod(companyId, year, month);
    const attendanceMap = new Map(attendanceData.map((a) => [a.userId, a]));

    const calculations: CreateSalaryCalculationData[] = [];

    for (const emp of employees.items) {
      // 근태 미확정 직원 처리
      if (!attendanceMap.has(emp.id)) {
        if (emp.attendanceExempt) {
          // 근태 면제: attData가 없으므로 아래에서 all-zero attendance로 계산 진행
          // → 기본급+고정수당만 지급, overtime/premium = 0
        } else {
          // 기존: 근태 미확정 → SKIPPED
          calculations.push({
            companyId,
            userId: emp.id,
            year,
            month,
            status: 'SKIPPED',
            ordinaryWageMonthly: 0,
            ordinaryWageHourly: 0,
            basePay: 0,
            fixedAllowances: 0,
            overtimePay: 0,
            nightPay: 0,
            nightOvertimePay: 0,
            holidayPay: 0,
            holidayOvertimePay: 0,
            holidayNightPay: 0,
            holidayNightOvertimePay: 0,
            variableAllowances: 0,
            attendanceDeductions: 0,
            totalPay: 0,
            totalNonTaxable: 0,
            taxableIncome: 0,
            nationalPension: 0,
            healthInsurance: 0,
            longTermCare: 0,
            employmentInsurance: 0,
            incomeTax: 0,
            localIncomeTax: 0,
            totalDeduction: 0,
            netPay: 0,
            prorationApplied: false,
            minimumWageWarning: false,
            errorMessage: '근태 미확정',
          });
          continue;
        }
      }

      try {
        // Per-employee WorkPolicy → PayrollSettings
        const empPolicy = emp.workPolicyId
          ? policyMap.get(emp.workPolicyId)
          : defaultPolicy;

        const settings: PayrollSettings = {
          monthlyWorkHours: empPolicy?.monthlyWorkHours ?? 209,
          prorationMethod: company.prorationMethod as 'CALENDAR_DAY' | 'WORKING_DAY',
          nightWorkStart: empPolicy?.nightWorkStartTime ?? '22:00',
          nightWorkEnd: empPolicy?.nightWorkEndTime ?? '06:00',
        };

        // Load salary items
        const salaryItems = await this.employeeSalaryItemRepo.findActiveByEmployee(companyId, emp.id);
        const salaryItemProps: SalaryItemProps[] = salaryItems.map((si) => ({
          id: si.id,
          code: si.code,
          name: si.name,
          type: si.type as SalaryItemProps['type'],
          paymentType: si.paymentType as SalaryItemProps['paymentType'],
          paymentCycle: si.paymentCycle as SalaryItemProps['paymentCycle'],
          amount: Number(si.amount),
          isOrdinaryWage: si.isOrdinaryWage,
          isTaxExempt: si.isTaxExempt,
          taxExemptCode: si.taxExemptCode ?? undefined,
          formula: si.formula ?? undefined,
          paymentMonths: si.paymentMonths ?? undefined,
        }));

        // Get attendance snapshot
        const attData = attendanceMap.get(emp.id);
        const attendance: AttendanceSummary = attData
          ? {
              regularMinutes: attData.totalRegularMinutes,
              overtimeMinutes: attData.totalOvertimeMinutes,
              nightMinutes: attData.totalNightMinutes,
              nightOvertimeMinutes: attData.totalNightOvertimeMinutes,
              holidayMinutes: attData.totalHolidayMinutes,
              holidayOvertimeMinutes: attData.totalHolidayOvertimeMinutes,
              holidayNightMinutes: attData.totalHolidayNightMinutes,
              holidayNightOvertimeMinutes: attData.totalHolidayNightOvertimeMinutes,
              absentDays: attData.absentDays,
              workDays: attData.workDays,
              totalLateMinutes: attData.totalLateMinutes,
              totalEarlyLeaveMinutes: attData.totalEarlyLeaveMinutes,
              paidLeaveDays: Number(attData.paidLeaveDays) || 0,
              unpaidLeaveDays: Number(attData.unpaidLeaveDays) || 0,
              paidLeaveMinutes: attData.paidLeaveMinutes || 0,
            }
          : {
              regularMinutes: 0,
              overtimeMinutes: 0,
              nightMinutes: 0,
              nightOvertimeMinutes: 0,
              holidayMinutes: 0,
              holidayOvertimeMinutes: 0,
              holidayNightMinutes: 0,
              holidayNightOvertimeMinutes: 0,
              absentDays: 0,
              workDays: 0,
            };

        const input: PayrollInput = {
          employee: {
            id: emp.id,
            name: emp.name,
            dependents: emp.dependents,
            joinDate: emp.joinDate ? new Date(emp.joinDate) : new Date(),
            resignDate: emp.resignDate ? new Date(emp.resignDate) : undefined,
            nationalPensionMode: emp.nationalPensionMode as 'AUTO' | 'MANUAL' | 'NONE',
            healthInsuranceMode: emp.healthInsuranceMode as 'AUTO' | 'MANUAL' | 'NONE',
            employmentInsuranceMode: emp.employmentInsuranceMode as 'AUTO' | 'MANUAL' | 'NONE',
            manualNationalPensionBase: emp.manualNationalPensionBase ? Number(emp.manualNationalPensionBase) : undefined,
            manualHealthInsuranceBase: emp.manualHealthInsuranceBase ? Number(emp.manualHealthInsuranceBase) : undefined,
            salaryType: (emp.salaryType as 'MONTHLY' | 'HOURLY') ?? 'MONTHLY',
            hourlyRate: emp.hourlyRate ? Number(emp.hourlyRate) : undefined,
          },
          salaryItems: salaryItemProps,
          attendance,
          insuranceRates,
          taxBrackets: taxBracketEntries,
          taxExemptLimits: taxExemptEntries,
          settings,
          year,
          month,
        };

        const result = this.payrollCalculator.calculate(input);

        calculations.push({
          companyId,
          userId: emp.id,
          year,
          month,
          status: result.status,
          ordinaryWageMonthly: result.ordinaryWageMonthly,
          ordinaryWageHourly: result.ordinaryWageHourly,
          basePay: result.basePay,
          fixedAllowances: result.fixedAllowances,
          overtimePay: result.overtimePay,
          nightPay: result.nightPay,
          nightOvertimePay: result.nightOvertimePay,
          holidayPay: result.holidayPay,
          holidayOvertimePay: result.holidayOvertimePay,
          holidayNightPay: result.holidayNightPay,
          holidayNightOvertimePay: result.holidayNightOvertimePay,
          variableAllowances: result.variableAllowances,
          attendanceDeductions: result.attendanceDeductions,
          totalPay: result.totalPay,
          totalNonTaxable: result.totalNonTaxable,
          taxableIncome: result.taxableIncome,
          nationalPension: result.nationalPension,
          healthInsurance: result.healthInsurance,
          longTermCare: result.longTermCare,
          employmentInsurance: result.employmentInsurance,
          incomeTax: result.incomeTax,
          localIncomeTax: result.localIncomeTax,
          totalDeduction: result.totalDeduction,
          netPay: result.netPay,
          payItemsSnapshot: result.ordinaryWageItems,
          deductionItemsSnapshot: result.nonTaxableItems,
          insuranceRatesSnapshot: insuranceRates,
          prorationApplied: result.prorationApplied,
          prorationRatio: result.prorationRatio,
          minimumWageWarning: result.minimumWageWarning ?? false,
          errorMessage: result.errorMessage,
        });
      } catch (error) {
        // Record failed calculation
        calculations.push({
          companyId,
          userId: emp.id,
          year,
          month,
          status: 'FAILED',
          ordinaryWageMonthly: 0,
          ordinaryWageHourly: 0,
          basePay: 0,
          fixedAllowances: 0,
          overtimePay: 0,
          nightPay: 0,
          nightOvertimePay: 0,
          holidayPay: 0,
          holidayOvertimePay: 0,
          holidayNightPay: 0,
          holidayNightOvertimePay: 0,
          variableAllowances: 0,
          attendanceDeductions: 0,
          totalPay: 0,
          totalNonTaxable: 0,
          taxableIncome: 0,
          nationalPension: 0,
          healthInsurance: 0,
          longTermCare: 0,
          employmentInsurance: 0,
          incomeTax: 0,
          localIncomeTax: 0,
          totalDeduction: 0,
          netPay: 0,
          prorationApplied: false,
          minimumWageWarning: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Bulk save all calculations
    if (calculations.length > 0) {
      await this.salaryCalcRepo.createMany(calculations);
    }

    // Return results
    return this.salaryCalcRepo.findByPeriod(companyId, year, month);
  }

  private buildInsuranceRateSet(rates: { type: string; employeeRate: number; minBase: number | null; maxBase: number | null }[]): InsuranceRateSet {
    const findRate = (type: string) => rates.find((r) => r.type === type);

    const pension = findRate('NATIONAL_PENSION');
    const health = findRate('HEALTH_INSURANCE');
    const ltc = findRate('LONG_TERM_CARE');
    const employment = findRate('EMPLOYMENT_INSURANCE');

    // Prisma Decimal → plain number 변환 (문자열 연결 방지)
    return {
      nationalPension: {
        rate: Number(pension?.employeeRate ?? 0.045),
        minBase: Number(pension?.minBase ?? 390000),
        maxBase: Number(pension?.maxBase ?? 6170000),
      },
      healthInsurance: {
        rate: Number(health?.employeeRate ?? 0.03545),
        minBase: Number(health?.minBase ?? 279000),
        maxBase: Number(health?.maxBase ?? 12706000),
      },
      longTermCare: {
        rate: Number(ltc?.employeeRate ?? 0.1295),
      },
      employmentInsurance: {
        rate: Number(employment?.employeeRate ?? 0.009),
      },
    };
  }
}
