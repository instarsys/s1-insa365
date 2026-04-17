import type { IPayrollMonthlyRepository } from '@/application/ports/IPayrollMonthlyRepository';
import type { ICompanyRepository } from '@/application/ports/ICompanyRepository';
import type { WithholdingReturnDto } from '@/application/dtos/tax';
import { ValidationError } from '@/domain/errors';

export class GetWithholdingReturnUseCase {
  constructor(
    private payrollMonthlyRepo: IPayrollMonthlyRepository,
    private companyRepo: ICompanyRepository,
  ) {}

  async execute(companyId: string, year: number, month: number): Promise<WithholdingReturnDto> {
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new ValidationError('회사 정보를 찾을 수 없습니다.');
    }

    const records = await this.payrollMonthlyRepo.findByYearMonth(companyId, year, month);
    if (records.length === 0) {
      throw new ValidationError('해당 월의 확정된 급여 데이터가 없습니다.');
    }

    // A01 근로소득 집계
    let totalPay = 0;
    let taxableIncome = 0;
    let incomeTax = 0;
    let localIncomeTax = 0;
    let npSum = 0;
    let hiSum = 0;
    let ltcSum = 0;
    let eiSum = 0;

    for (const r of records) {
      totalPay += Number(r.totalPay);
      taxableIncome += Number(r.taxableIncome);
      incomeTax += Number(r.incomeTax);
      localIncomeTax += Number(r.localIncomeTax);
      npSum += Number(r.nationalPension);
      hiSum += Number(r.healthInsurance);
      ltcSum += Number(r.longTermCare);
      eiSum += Number(r.employmentInsurance);
    }

    // 사업주 부담분 = 근로자와 동일 (MVP 간소화)
    const employerContributions = {
      nationalPension: npSum,
      healthInsurance: hiSum,
      longTermCare: ltcSum,
      employmentInsurance: eiSum,
    };

    return {
      companyName: company.name,
      businessNumber: company.businessNumber,
      representativeName: company.representativeName,
      corporateRegistrationNumber: company.corporateRegistrationNumber ?? null,
      businessType: company.businessType ?? null,
      businessCategory: company.businessCategory ?? null,
      taxOfficeCode: company.taxOfficeCode ?? null,
      taxOfficeName: company.taxOfficeName ?? null,
      year,
      month,
      a01: {
        headCount: records.length,
        totalPay,
        taxableIncome,
        incomeTax,
        localIncomeTax,
      },
      employerContributions,
      totalTaxToPay: incomeTax + localIncomeTax,
      totalInsuranceToPay:
        npSum + hiSum + ltcSum + eiSum +
        employerContributions.nationalPension +
        employerContributions.healthInsurance +
        employerContributions.longTermCare +
        employerContributions.employmentInsurance,
    };
  }
}
