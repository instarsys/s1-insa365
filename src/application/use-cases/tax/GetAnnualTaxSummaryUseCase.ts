import type { IPayrollMonthlyRepository } from '@/application/ports/IPayrollMonthlyRepository';
import type { AnnualTaxSummaryDto, MonthlyTaxPaymentDto } from '@/application/dtos/tax';

export class GetAnnualTaxSummaryUseCase {
  constructor(private payrollMonthlyRepo: IPayrollMonthlyRepository) {}

  async execute(companyId: string, year: number): Promise<{
    summary: AnnualTaxSummaryDto;
    payments: MonthlyTaxPaymentDto[];
  }> {
    const records = await this.payrollMonthlyRepo.findByYear(companyId, year);

    // 월별 집계
    const byMonth = new Map<number, {
      incomeTax: number; localIncomeTax: number;
      nationalPension: number; healthInsurance: number;
      longTermCare: number; employmentInsurance: number;
      totalPay: number; taxableIncome: number; totalNonTaxable: number;
    }>();

    for (const r of records) {
      const m = byMonth.get(r.month) ?? {
        incomeTax: 0, localIncomeTax: 0,
        nationalPension: 0, healthInsurance: 0,
        longTermCare: 0, employmentInsurance: 0,
        totalPay: 0, taxableIncome: 0, totalNonTaxable: 0,
      };
      m.incomeTax += Number(r.incomeTax);
      m.localIncomeTax += Number(r.localIncomeTax);
      m.nationalPension += Number(r.nationalPension);
      m.healthInsurance += Number(r.healthInsurance);
      m.longTermCare += Number(r.longTermCare);
      m.employmentInsurance += Number(r.employmentInsurance);
      m.totalPay += Number(r.totalPay);
      m.taxableIncome += Number(r.taxableIncome);
      m.totalNonTaxable += Number(r.totalNonTaxable);
      byMonth.set(r.month, m);
    }

    // 연간 누적
    let annualTotalPay = 0, annualTaxableIncome = 0, annualTotalNonTaxable = 0;
    let annualNP = 0, annualHI = 0, annualLTC = 0, annualEI = 0;
    let annualIT = 0, annualLIT = 0;

    for (const m of byMonth.values()) {
      annualTotalPay += m.totalPay;
      annualTaxableIncome += m.taxableIncome;
      annualTotalNonTaxable += m.totalNonTaxable;
      annualNP += m.nationalPension;
      annualHI += m.healthInsurance;
      annualLTC += m.longTermCare;
      annualEI += m.employmentInsurance;
      annualIT += m.incomeTax;
      annualLIT += m.localIncomeTax;
    }

    // 월별 납부서
    const payments: MonthlyTaxPaymentDto[] = Array.from(byMonth.entries())
      .sort(([a], [b]) => a - b)
      .map(([month, m]) => {
        // 납부기한: 다음달 10일
        const dueMonth = month === 12 ? 1 : month + 1;
        const dueYear = month === 12 ? year + 1 : year;
        const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-10`;

        return {
          month,
          incomeTax: m.incomeTax,
          localIncomeTax: m.localIncomeTax,
          totalTax: m.incomeTax + m.localIncomeTax,
          incomeTaxDueDate: dueDate,
          nationalPension: m.nationalPension,
          healthInsurance: m.healthInsurance,
          longTermCare: m.longTermCare,
          employmentInsurance: m.employmentInsurance,
          // 사업주 부담분 (MVP: 근로자와 동일)
          employerNationalPension: m.nationalPension,
          employerHealthInsurance: m.healthInsurance,
          employerLongTermCare: m.longTermCare,
          employerEmploymentInsurance: m.employmentInsurance,
          totalInsurance: (m.nationalPension + m.healthInsurance + m.longTermCare + m.employmentInsurance) * 2,
          insuranceDueDate: dueDate,
        };
      });

    return {
      summary: {
        year,
        annualTotalPay,
        annualTaxableIncome,
        annualTotalNonTaxable,
        annualNationalPension: annualNP,
        annualHealthInsurance: annualHI,
        annualLongTermCare: annualLTC,
        annualEmploymentInsurance: annualEI,
        annualIncomeTax: annualIT,
        annualLocalIncomeTax: annualLIT,
      },
      payments,
    };
  }
}
