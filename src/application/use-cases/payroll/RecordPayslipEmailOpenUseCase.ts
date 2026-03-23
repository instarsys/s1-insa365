interface PayslipEmailLogRepo {
  recordOpen(trackingToken: string): Promise<boolean>;
}

export class RecordPayslipEmailOpenUseCase {
  constructor(private payslipEmailLogRepo: PayslipEmailLogRepo) {}

  async execute(trackingToken: string): Promise<boolean> {
    return this.payslipEmailLogRepo.recordOpen(trackingToken);
  }
}
