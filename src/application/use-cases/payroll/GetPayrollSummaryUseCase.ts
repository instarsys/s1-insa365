import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { PayrollSummaryDto } from '../../dtos/payroll';

export class GetPayrollSummaryUseCase {
  constructor(private salaryCalcRepo: ISalaryCalculationRepository) {}

  async execute(companyId: string, year: number, month: number): Promise<PayrollSummaryDto | null> {
    const summary = await this.salaryCalcRepo.getSummary(companyId, year, month);
    if (!summary) {
      return null;
    }

    // Get previous month for comparison
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const prevSummary = await this.salaryCalcRepo.getSummary(companyId, prevYear, prevMonth);

    return {
      year,
      month,
      status: summary.status,
      totalEmployees: summary.totalEmployees,
      calculatedCount: summary.calculatedCount,
      confirmedCount: summary.confirmedCount,
      failedCount: summary.failedCount,
      skippedCount: summary.skippedCount,
      totalPay: summary.totalPay,
      totalDeduction: summary.totalDeduction,
      totalNetPay: summary.totalNetPay,
      previousMonth: prevSummary
        ? {
            totalPay: prevSummary.totalPay,
            totalNetPay: prevSummary.totalNetPay,
          }
        : null,
    };
  }
}
