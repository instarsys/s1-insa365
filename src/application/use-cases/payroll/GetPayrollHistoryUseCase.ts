import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { PayrollHistoryDto } from '../../dtos/payroll';
import type { PaginatedResult } from '../../dtos/common';

export class GetPayrollHistoryUseCase {
  constructor(private salaryCalcRepo: ISalaryCalculationRepository) {}

  async execute(companyId: string, page?: number, limit?: number): Promise<PaginatedResult<PayrollHistoryDto>> {
    return this.salaryCalcRepo.getHistory(companyId, page ?? 1, limit ?? 12);
  }
}
