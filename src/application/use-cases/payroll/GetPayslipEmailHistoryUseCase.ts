interface PayslipEmailLogRepo {
  findByPeriod(
    companyId: string,
    year: number,
    month: number,
  ): Promise<unknown[]>;
}

export class GetPayslipEmailHistoryUseCase {
  constructor(private payslipEmailLogRepo: PayslipEmailLogRepo) {}

  async execute(companyId: string, year: number, month: number) {
    return this.payslipEmailLogRepo.findByPeriod(companyId, year, month);
  }
}
