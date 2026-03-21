import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { IPayrollMonthlyRepository } from '../../ports/IPayrollMonthlyRepository';
import { ValidationError } from '@domain/errors';

export class ConfirmPayrollUseCase {
  constructor(
    private salaryCalcRepo: ISalaryCalculationRepository,
    private payrollMonthlyRepo: IPayrollMonthlyRepository,
  ) {}

  async execute(companyId: string, year: number, month: number, confirmedBy: string): Promise<void> {
    const calculations = await this.salaryCalcRepo.findByPeriod(companyId, year, month);
    if (calculations.length === 0) {
      throw new ValidationError('해당 기간의 급여 계산 데이터가 없습니다. 먼저 급여를 계산해주세요.');
    }

    const hasConfirmed = calculations.some((c) => c.status === 'CONFIRMED' || c.status === 'PAID');
    if (hasConfirmed) {
      throw new ValidationError('해당 기간의 급여가 이미 확정되었습니다.');
    }

    // Update all DRAFT calculations to CONFIRMED
    await this.salaryCalcRepo.updateStatus(companyId, year, month, 'CONFIRMED', confirmedBy);

    // Create PayrollMonthly records for withholding history
    const monthlyRecords = calculations
      .filter((c) => c.status === 'DRAFT')
      .map((c) => ({
        companyId,
        userId: c.employeeId,
        year,
        month,
        totalPay: c.totalPay,
        taxableIncome: c.taxableIncome,
        totalNonTaxable: c.totalNonTaxable,
        nationalPension: c.nationalPension,
        healthInsurance: c.healthInsurance,
        longTermCare: c.longTermCare,
        employmentInsurance: c.employmentInsurance,
        incomeTax: c.incomeTax,
        localIncomeTax: c.localIncomeTax,
        netPay: c.netPay,
      }));

    if (monthlyRecords.length > 0) {
      await this.payrollMonthlyRepo.createMany(monthlyRecords);
    }
  }
}
