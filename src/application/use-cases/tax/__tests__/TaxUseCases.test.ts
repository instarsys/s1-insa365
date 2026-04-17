import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetWithholdingReturnUseCase } from '../GetWithholdingReturnUseCase';
import { GetSimplifiedStatementUseCase } from '../GetSimplifiedStatementUseCase';
import { GetWithholdingReceiptUseCase } from '../GetWithholdingReceiptUseCase';
import { GetAnnualTaxSummaryUseCase } from '../GetAnnualTaxSummaryUseCase';

function createCompanyRepo() {
  return {
    findById: vi.fn().mockResolvedValue({
      id: 'company-1',
      name: '테스트 주식회사',
      businessNumber: '123-45-67890',
      representativeName: '홍길동',
      address: '서울특별시 강남구 테헤란로 123',
      phone: '0212345678',
      email: 'admin@test-company.com',
      payDay: 25,
      prorationMethod: 'CALENDAR_DAY',
      subscriptionPlan: 'TRIAL',
      gpsEnforcementMode: 'OFF',
      logoUrl: null,
      sealUrl: null,
      corporateRegistrationNumber: '110111-1234567',
      businessType: '서비스업',
      businessCategory: '소프트웨어 개발',
      taxOfficeCode: '212',
      taxOfficeName: '강남세무서',
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
  };
}

function createPayrollMonthlyRepo() {
  return {
    findByYear: vi.fn(),
    findByYearMonth: vi.fn(),
    findByYearHalf: vi.fn(),
    findByEmployeeAndYear: vi.fn(),
  };
}

function createEmployeeRepo() {
  return {
    findById: vi.fn().mockResolvedValue({
      id: 'user-1',
      name: '김영수',
      employeeNumber: 'EA0001',
      departmentName: '개발팀',
      joinDate: '2025-01-15T00:00:00.000Z',
      resignDate: null,
    }),
  };
}

describe('Tax use cases', () => {
  let companyRepo: ReturnType<typeof createCompanyRepo>;
  let payrollMonthlyRepo: ReturnType<typeof createPayrollMonthlyRepo>;
  let employeeRepo: ReturnType<typeof createEmployeeRepo>;

  beforeEach(() => {
    companyRepo = createCompanyRepo();
    payrollMonthlyRepo = createPayrollMonthlyRepo();
    employeeRepo = createEmployeeRepo();
  });

  it('원천징수이행상황신고서에 회사 세무 필드가 반영된다', async () => {
    payrollMonthlyRepo.findByYearMonth.mockResolvedValue([
      {
        userId: 'user-1',
        month: 3,
        totalPay: 5_000_000,
        taxableIncome: 4_700_000,
        totalNonTaxable: 300_000,
        nationalPension: 211_500,
        healthInsurance: 166_615,
        longTermCare: 21_576,
        employmentInsurance: 42_300,
        incomeTax: 150_000,
        localIncomeTax: 15_000,
      },
    ]);

    const useCase = new GetWithholdingReturnUseCase(
      payrollMonthlyRepo as never,
      companyRepo as never,
    );

    const result = await useCase.execute('company-1', 2026, 3);

    expect(result.companyName).toBe('테스트 주식회사');
    expect(result.corporateRegistrationNumber).toBe('110111-1234567');
    expect(result.businessType).toBe('서비스업');
    expect(result.businessCategory).toBe('소프트웨어 개발');
    expect(result.taxOfficeCode).toBe('212');
    expect(result.taxOfficeName).toBe('강남세무서');
    expect(result.totalTaxToPay).toBe(165_000);
  });

  it('간이지급명세서는 residentNumberMasked를 사용해 반기 집계한다', async () => {
    payrollMonthlyRepo.findByYearHalf.mockResolvedValue([
      {
        userId: 'user-1',
        employeeName: '김영수',
        employeeNumber: 'EA0001',
        totalPay: 3_000_000,
        taxableIncome: 2_800_000,
        totalNonTaxable: 200_000,
        incomeTax: 70_000,
        localIncomeTax: 7_000,
        snapshotMetadata: { residentNumberMasked: '900101-*******' },
      },
      {
        userId: 'user-1',
        employeeName: '김영수',
        employeeNumber: 'EA0001',
        totalPay: 3_200_000,
        taxableIncome: 3_000_000,
        totalNonTaxable: 200_000,
        incomeTax: 80_000,
        localIncomeTax: 8_000,
        snapshotMetadata: {},
      },
    ]);

    const useCase = new GetSimplifiedStatementUseCase(
      payrollMonthlyRepo as never,
      companyRepo as never,
    );

    const result = await useCase.execute('company-1', 2026, 1);

    expect(result.employees).toHaveLength(1);
    expect(result.employees[0].residentNumberMasked).toBe('900101-*******');
    expect(result.employees[0].totalPay).toBe(6_200_000);
    expect(result.totals.taxableIncome).toBe(5_800_000);
  });

  it('원천징수영수증은 직원 단위 연간 조회를 사용하고 연간 합계를 계산한다', async () => {
    payrollMonthlyRepo.findByEmployeeAndYear.mockResolvedValue([
      {
        userId: 'user-1',
        month: 1,
        totalPay: 4_000_000,
        taxableIncome: 3_700_000,
        totalNonTaxable: 300_000,
        nationalPension: 166_500,
        healthInsurance: 131_165,
        longTermCare: 16_984,
        employmentInsurance: 33_300,
        incomeTax: 90_000,
        localIncomeTax: 9_000,
        snapshotMetadata: { residentNumberMasked: '900101-*******' },
      },
      {
        userId: 'user-1',
        month: 2,
        totalPay: 4_200_000,
        taxableIncome: 3_900_000,
        totalNonTaxable: 300_000,
        nationalPension: 175_500,
        healthInsurance: 138_255,
        longTermCare: 17_902,
        employmentInsurance: 35_100,
        incomeTax: 95_000,
        localIncomeTax: 9_500,
        snapshotMetadata: {},
      },
    ]);

    const useCase = new GetWithholdingReceiptUseCase(
      payrollMonthlyRepo as never,
      companyRepo as never,
      employeeRepo as never,
    );

    const result = await useCase.execute('company-1', 2026, 'user-1');

    expect(payrollMonthlyRepo.findByEmployeeAndYear).toHaveBeenCalledWith('company-1', 'user-1', 2026);
    expect(result.employee.residentNumberMasked).toBe('900101-*******');
    expect(result.annual.totalPay).toBe(8_200_000);
    expect(result.annual.incomeTax).toBe(185_000);
    expect(result.annual.localIncomeTax).toBe(18_500);
  });

  it('연간 요약은 월별 납부서와 연간 합계를 계산한다', async () => {
    payrollMonthlyRepo.findByYear.mockResolvedValue([
      {
        month: 1,
        totalPay: 4_000_000,
        taxableIncome: 3_700_000,
        totalNonTaxable: 300_000,
        nationalPension: 166_500,
        healthInsurance: 131_165,
        longTermCare: 16_984,
        employmentInsurance: 33_300,
        incomeTax: 90_000,
        localIncomeTax: 9_000,
      },
      {
        month: 2,
        totalPay: 4_500_000,
        taxableIncome: 4_200_000,
        totalNonTaxable: 300_000,
        nationalPension: 189_000,
        healthInsurance: 148_890,
        longTermCare: 19_281,
        employmentInsurance: 37_800,
        incomeTax: 110_000,
        localIncomeTax: 11_000,
      },
    ]);

    const useCase = new GetAnnualTaxSummaryUseCase(payrollMonthlyRepo as never);

    const result = await useCase.execute('company-1', 2026);

    expect(result.summary.annualTotalPay).toBe(8_500_000);
    expect(result.summary.annualTaxableIncome).toBe(7_900_000);
    expect(result.summary.annualIncomeTax).toBe(200_000);
    expect(result.summary.annualLocalIncomeTax).toBe(20_000);
    expect(result.payments).toHaveLength(2);
    expect(result.payments[0].incomeTaxDueDate).toBe('2026-02-10');
    expect(result.payments[1].insuranceDueDate).toBe('2026-03-10');
  });
});
