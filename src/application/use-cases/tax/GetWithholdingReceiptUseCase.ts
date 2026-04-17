import type { IPayrollMonthlyRepository } from '@/application/ports/IPayrollMonthlyRepository';
import type { ICompanyRepository } from '@/application/ports/ICompanyRepository';
import type { IEmployeeRepository } from '@/application/ports/IEmployeeRepository';
import type { WithholdingReceiptDto } from '@/application/dtos/tax';
import { ValidationError } from '@/domain/errors';

export class GetWithholdingReceiptUseCase {
  constructor(
    private payrollMonthlyRepo: IPayrollMonthlyRepository,
    private companyRepo: ICompanyRepository,
    private employeeRepo: IEmployeeRepository,
  ) {}

  async execute(companyId: string, year: number, userId: string): Promise<WithholdingReceiptDto> {
    const company = await this.companyRepo.findById(companyId);
    if (!company) throw new ValidationError('회사 정보를 찾을 수 없습니다.');

    const employee = await this.employeeRepo.findById(companyId, userId);
    if (!employee) throw new ValidationError('직원 정보를 찾을 수 없습니다.');

    const records = await this.payrollMonthlyRepo.findByEmployeeAndYear(companyId, userId, year);
    if (records.length === 0) {
      throw new ValidationError(`${year}년 해당 직원의 확정된 급여 데이터가 없습니다.`);
    }

    // 주민등록번호 마스킹
    let residentNumberMasked = '';
    for (const r of records) {
      if (r.snapshotMetadata && typeof r.snapshotMetadata === 'object') {
        const meta = r.snapshotMetadata as Record<string, unknown>;
        const masked = meta.residentNumberMasked as string | undefined;
        if (masked) {
          residentNumberMasked = masked;
          break;
        }
      }
    }

    const monthly = records
      .sort((a, b) => a.month - b.month)
      .map((r) => ({
        month: r.month,
        totalPay: Number(r.totalPay),
        taxableIncome: Number(r.taxableIncome),
        totalNonTaxable: Number(r.totalNonTaxable),
        nationalPension: Number(r.nationalPension),
        healthInsurance: Number(r.healthInsurance),
        longTermCare: Number(r.longTermCare),
        employmentInsurance: Number(r.employmentInsurance),
        incomeTax: Number(r.incomeTax),
        localIncomeTax: Number(r.localIncomeTax),
      }));

    const annual = monthly.reduce(
      (acc, m) => ({
        totalPay: acc.totalPay + m.totalPay,
        taxableIncome: acc.taxableIncome + m.taxableIncome,
        totalNonTaxable: acc.totalNonTaxable + m.totalNonTaxable,
        nationalPension: acc.nationalPension + m.nationalPension,
        healthInsurance: acc.healthInsurance + m.healthInsurance,
        longTermCare: acc.longTermCare + m.longTermCare,
        employmentInsurance: acc.employmentInsurance + m.employmentInsurance,
        incomeTax: acc.incomeTax + m.incomeTax,
        localIncomeTax: acc.localIncomeTax + m.localIncomeTax,
      }),
      { totalPay: 0, taxableIncome: 0, totalNonTaxable: 0, nationalPension: 0, healthInsurance: 0, longTermCare: 0, employmentInsurance: 0, incomeTax: 0, localIncomeTax: 0 },
    );

    return {
      company: {
        name: company.name,
        businessNumber: company.businessNumber,
        representativeName: company.representativeName,
        corporateRegistrationNumber: company.corporateRegistrationNumber ?? null,
        address: company.address ?? null,
      },
      employee: {
        name: employee.name,
        employeeNumber: employee.employeeNumber ?? '',
        residentNumberMasked,
        departmentName: employee.departmentName ?? '',
        joinDate: employee.joinDate ?? null,
        resignDate: employee.resignDate ?? null,
      },
      year,
      monthly,
      annual,
    };
  }
}
