import type { IPayrollMonthlyRepository } from '@/application/ports/IPayrollMonthlyRepository';
import type { WithholdingMonthlySummaryDto } from '@/application/dtos/tax';

export class GetWithholdingSummaryUseCase {
  constructor(private payrollMonthlyRepo: IPayrollMonthlyRepository) {}

  async execute(companyId: string, year: number): Promise<WithholdingMonthlySummaryDto[]> {
    const records = await this.payrollMonthlyRepo.findByYear(companyId, year);

    // 월별 그룹핑 + 집계
    const byMonth = new Map<number, WithholdingMonthlySummaryDto>();

    for (const r of records) {
      const existing = byMonth.get(r.month);
      const np = Number(r.nationalPension);
      const hi = Number(r.healthInsurance);
      const ltc = Number(r.longTermCare);
      const ei = Number(r.employmentInsurance);
      const it = Number(r.incomeTax);
      const lit = Number(r.localIncomeTax);

      if (existing) {
        existing.headCount += 1;
        existing.totalPay += Number(r.totalPay);
        existing.taxableIncome += Number(r.taxableIncome);
        existing.totalNonTaxable += Number(r.totalNonTaxable);
        existing.nationalPension += np;
        existing.healthInsurance += hi;
        existing.longTermCare += ltc;
        existing.employmentInsurance += ei;
        existing.incomeTax += it;
        existing.localIncomeTax += lit;
        existing.total += np + hi + ltc + ei + it + lit;
      } else {
        byMonth.set(r.month, {
          month: r.month,
          headCount: 1,
          totalPay: Number(r.totalPay),
          taxableIncome: Number(r.taxableIncome),
          totalNonTaxable: Number(r.totalNonTaxable),
          nationalPension: np,
          healthInsurance: hi,
          longTermCare: ltc,
          employmentInsurance: ei,
          incomeTax: it,
          localIncomeTax: lit,
          total: np + hi + ltc + ei + it + lit,
        });
      }
    }

    return Array.from(byMonth.values()).sort((a, b) => a.month - b.month);
  }
}
