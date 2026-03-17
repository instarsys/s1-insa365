import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { PayrollResultDto, UpdatePayrollItemDto } from '../../dtos/payroll';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

export class UpdatePayrollItemUseCase {
  constructor(private salaryCalcRepo: ISalaryCalculationRepository) {}

  async execute(companyId: string, calculationId: string, dto: UpdatePayrollItemDto): Promise<PayrollResultDto> {
    // We need to find by period first, then filter. But we only have the ID.
    // The repo update method handles the lookup.
    const result = await this.salaryCalcRepo.update(companyId, calculationId, {
      variableAllowances: dto.variableAllowances,
    });

    if (!result) {
      throw new EntityNotFoundError('SalaryCalculation', calculationId);
    }

    if (result.status === 'CONFIRMED' || result.status === 'PAID') {
      throw new ValidationError('Cannot update confirmed or paid payroll');
    }

    return result;
  }
}
