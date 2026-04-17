import type { IPayrollMonthlyRepository } from '@/application/ports/IPayrollMonthlyRepository';
import type { ICompanyRepository } from '@/application/ports/ICompanyRepository';
import type { SimplifiedStatementDto, SimplifiedStatementEmployeeDto } from '@/application/dtos/tax';
import { ValidationError } from '@/domain/errors';

export class GetSimplifiedStatementUseCase {
  constructor(
    private payrollMonthlyRepo: IPayrollMonthlyRepository,
    private companyRepo: ICompanyRepository,
  ) {}

  async execute(companyId: string, year: number, half: 1 | 2): Promise<SimplifiedStatementDto> {
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new ValidationError('회사 정보를 찾을 수 없습니다.');
    }

    const records = await this.payrollMonthlyRepo.findByYearHalf(companyId, year, half);
    if (records.length === 0) {
      throw new ValidationError(`${year}년 ${half === 1 ? '상' : '하'}반기 확정된 급여 데이터가 없습니다.`);
    }

    // userId별 그룹핑 → 반기 합산
    const byUser = new Map<string, {
      employeeName: string;
      employeeNumber: string;
      residentNumberMasked: string;
      totalPay: number;
      taxableIncome: number;
      totalNonTaxable: number;
      incomeTax: number;
      localIncomeTax: number;
    }>();

    for (const r of records) {
      const existing = byUser.get(r.userId);
      const tp = Number(r.totalPay);
      const ti = Number(r.taxableIncome);
      const tnt = Number(r.totalNonTaxable);
      const it = Number(r.incomeTax);
      const lit = Number(r.localIncomeTax);

      // 주민등록번호 마스킹: 급여 확정 시 snapshotMetadata에 저장된 값 사용
      let residentNumberMasked = '';
      if (r.snapshotMetadata && typeof r.snapshotMetadata === 'object') {
        const meta = r.snapshotMetadata as Record<string, unknown>;
        const masked = meta.residentNumberMasked as string | undefined;
        if (masked) {
          residentNumberMasked = masked;
        }
      }

      if (existing) {
        existing.totalPay += tp;
        existing.taxableIncome += ti;
        existing.totalNonTaxable += tnt;
        existing.incomeTax += it;
        existing.localIncomeTax += lit;
        if (!existing.residentNumberMasked && residentNumberMasked) {
          existing.residentNumberMasked = residentNumberMasked;
        }
      } else {
        byUser.set(r.userId, {
          employeeName: r.employeeName ?? '',
          employeeNumber: r.employeeNumber ?? '',
          residentNumberMasked,
          totalPay: tp,
          taxableIncome: ti,
          totalNonTaxable: tnt,
          incomeTax: it,
          localIncomeTax: lit,
        });
      }
    }

    const employees: SimplifiedStatementEmployeeDto[] = Array.from(byUser.values())
      .sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber));

    const totals = employees.reduce(
      (acc, emp) => ({
        totalPay: acc.totalPay + emp.totalPay,
        taxableIncome: acc.taxableIncome + emp.taxableIncome,
        totalNonTaxable: acc.totalNonTaxable + emp.totalNonTaxable,
        incomeTax: acc.incomeTax + emp.incomeTax,
        localIncomeTax: acc.localIncomeTax + emp.localIncomeTax,
      }),
      { totalPay: 0, taxableIncome: 0, totalNonTaxable: 0, incomeTax: 0, localIncomeTax: 0 },
    );

    const monthStart = half === 1 ? 1 : 7;
    const monthEnd = half === 1 ? 6 : 12;

    return {
      companyName: company.name,
      businessNumber: company.businessNumber,
      year,
      half,
      periodStart: `${year}-${String(monthStart).padStart(2, '0')}-01`,
      periodEnd: `${year}-${String(monthEnd).padStart(2, '0')}-${monthEnd === 6 ? '30' : '31'}`,
      employees,
      totals,
    };
  }
}
