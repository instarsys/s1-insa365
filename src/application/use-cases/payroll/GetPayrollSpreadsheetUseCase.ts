import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { PayrollSpreadsheetRowDto } from '../../dtos/payroll';

export class GetPayrollSpreadsheetUseCase {
  constructor(private salaryCalcRepo: ISalaryCalculationRepository) {}

  async execute(companyId: string, year: number, month: number): Promise<PayrollSpreadsheetRowDto[]> {
    return this.salaryCalcRepo.getSpreadsheet(companyId, year, month);
  }
}
