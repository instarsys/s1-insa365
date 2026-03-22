import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { PayrollResultDto, UpdatePayrollItemDto } from '../../dtos/payroll';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

export class UpdatePayrollItemUseCase {
  constructor(private salaryCalcRepo: ISalaryCalculationRepository) {}

  async execute(companyId: string, calculationId: string, dto: UpdatePayrollItemDto): Promise<PayrollResultDto> {
    // 먼저 조회하여 상태 확인 (check-before-update)
    const existing = await this.salaryCalcRepo.findByIdWithDetails(companyId, calculationId);

    if (!existing) {
      throw new EntityNotFoundError('SalaryCalculation', calculationId);
    }

    if (existing.status === 'CONFIRMED' || existing.status === 'PAID') {
      throw new ValidationError('확정 또는 지급 완료된 급여는 수정할 수 없습니다.');
    }

    const result = await this.salaryCalcRepo.update(companyId, calculationId, {
      variableAllowances: dto.variableAllowances,
    });

    if (!result) {
      throw new EntityNotFoundError('SalaryCalculation', calculationId);
    }

    return result;
  }
}
