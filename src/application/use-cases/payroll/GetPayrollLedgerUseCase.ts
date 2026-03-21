import type { ISalaryCalculationRepository } from '../../ports/ISalaryCalculationRepository';
import type { ICompanyRepository } from '../../ports/ICompanyRepository';
import type { PayrollLedgerDto } from '../../dtos/payroll';
import { ValidationError } from '@domain/errors';

export class GetPayrollLedgerUseCase {
  constructor(
    private salaryCalcRepo: ISalaryCalculationRepository,
    private companyRepo: ICompanyRepository,
  ) {}

  async execute(companyId: string, year: number, month: number): Promise<PayrollLedgerDto> {
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new ValidationError('회사 정보를 찾을 수 없습니다.');
    }

    const rows = await this.salaryCalcRepo.getLedger(companyId, year, month);

    const totals = rows.reduce(
      (acc, row) => ({
        totalPay: acc.totalPay + row.totalPay,
        totalDeduction: acc.totalDeduction + row.totalDeduction,
        totalNetPay: acc.totalNetPay + row.netPay,
      }),
      { totalPay: 0, totalDeduction: 0, totalNetPay: 0 },
    );

    return {
      year,
      month,
      companyName: company.name,
      rows,
      totals,
    };
  }
}
