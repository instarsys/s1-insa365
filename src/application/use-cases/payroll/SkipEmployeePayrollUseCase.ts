import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { PayrollResultDto } from '../../dtos/payroll';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

export class SkipEmployeePayrollUseCase {
  constructor(private salaryCalcRepo: ISalaryCalculationRepository) {}

  async execute(companyId: string, userId: string, year: number, month: number, _skipReason: string): Promise<PayrollResultDto> {
    const existing = await this.salaryCalcRepo.findByEmployeeAndPeriod(companyId, userId, year, month);
    if (!existing) {
      throw new EntityNotFoundError('SalaryCalculation', `${userId}/${year}/${month}`);
    }

    if (existing.status === 'CONFIRMED' || existing.status === 'PAID') {
      throw new ValidationError('Cannot skip confirmed or paid payroll');
    }

    const result = await this.salaryCalcRepo.update(companyId, existing.id, {
      status: 'SKIPPED',
      totalPay: 0,
      totalDeduction: 0,
      netPay: 0,
    });

    if (!result) {
      throw new EntityNotFoundError('SalaryCalculation', `${userId}/${year}/${month}`);
    }

    return result;
  }
}
