import type { IPayrollMonthlyRepository } from '@/application/ports/IPayrollMonthlyRepository';
import type { WithholdingEmployeeDetailDto } from '@/application/dtos/tax';

export class GetWithholdingEmployeesUseCase {
  constructor(private payrollMonthlyRepo: IPayrollMonthlyRepository) {}

  async execute(companyId: string, year: number, month: number): Promise<WithholdingEmployeeDetailDto[]> {
    const records = await this.payrollMonthlyRepo.findByYearMonth(companyId, year, month);

    return records.map((r) => {
      const np = Number(r.nationalPension);
      const hi = Number(r.healthInsurance);
      const ltc = Number(r.longTermCare);
      const ei = Number(r.employmentInsurance);
      const it = Number(r.incomeTax);
      const lit = Number(r.localIncomeTax);

      return {
        userId: r.userId,
        employeeName: r.employeeName ?? '',
        employeeNumber: r.employeeNumber ?? '',
        departmentName: r.departmentName ?? '',
        totalPay: Number(r.totalPay),
        taxableIncome: Number(r.taxableIncome),
        totalNonTaxable: Number(r.totalNonTaxable),
        nationalPension: np,
        healthInsurance: hi,
        longTermCare: ltc,
        employmentInsurance: ei,
        incomeTax: it,
        localIncomeTax: lit,
        totalDeduction: np + hi + ltc + ei + it + lit,
        netPay: Number(r.netPay),
      };
    });
  }
}
