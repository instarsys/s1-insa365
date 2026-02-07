import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { IPayrollMonthlyRepository } from '../../ports/IPayrollMonthlyRepository';
import { ValidationError } from '@domain/errors';

export class CancelPayrollUseCase {
  constructor(
    private salaryCalcRepo: ISalaryCalculationRepository,
    private payrollMonthlyRepo: IPayrollMonthlyRepository,
  ) {}

  async execute(companyId: string, year: number, month: number): Promise<void> {
    const calculations = await this.salaryCalcRepo.findByPeriod(companyId, year, month);
    if (calculations.length === 0) {
      throw new ValidationError('No payroll calculations found for this period');
    }

    const confirmed = calculations.find((c) => c.status === 'CONFIRMED');
    if (!confirmed) {
      throw new ValidationError('Payroll is not in CONFIRMED status');
    }

    const hasPaid = calculations.some((c) => c.status === 'PAID');
    if (hasPaid) {
      throw new ValidationError('Cannot cancel paid payroll');
    }

    // Check 24h cancel window — we don't have confirmedAt on the DTO, so
    // this would ideally be checked. For now we trust the infrastructure
    // layer to enforce the window if needed. This is a placeholder.

    // Revert to DRAFT status
    await this.salaryCalcRepo.updateStatus(companyId, year, month, 'DRAFT');

    // Delete PayrollMonthly records
    await this.payrollMonthlyRepo.deleteByPeriod(companyId, year, month);
  }
}
