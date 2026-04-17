// 1단계: 원천징수 현황 월별 집계
export interface WithholdingMonthlySummaryDto {
  month: number;
  headCount: number;
  totalPay: number;
  taxableIncome: number;
  totalNonTaxable: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localIncomeTax: number;
  total: number; // 6개 공제 합계
}

// 2단계: 직원별 원천징수 상세
export interface WithholdingEmployeeDetailDto {
  userId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  totalPay: number;
  taxableIncome: number;
  totalNonTaxable: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localIncomeTax: number;
  totalDeduction: number;
  netPay: number;
}

// 3단계: 원천징수이행상황신고서
export interface WithholdingReturnDto {
  companyName: string;
  businessNumber: string;
  representativeName: string;
  corporateRegistrationNumber: string | null;
  businessType: string | null;
  businessCategory: string | null;
  taxOfficeCode: string | null;
  taxOfficeName: string | null;
  year: number;
  month: number;
  a01: {
    headCount: number;
    totalPay: number;
    taxableIncome: number;
    incomeTax: number;
    localIncomeTax: number;
  };
  employerContributions: {
    nationalPension: number;
    healthInsurance: number;
    longTermCare: number;
    employmentInsurance: number;
  };
  totalTaxToPay: number;
  totalInsuranceToPay: number;
}

// 4단계: 간이지급명세서
export interface SimplifiedStatementEmployeeDto {
  employeeName: string;
  employeeNumber: string;
  residentNumberMasked: string;
  totalPay: number;
  taxableIncome: number;
  totalNonTaxable: number;
  incomeTax: number;
  localIncomeTax: number;
}

export interface SimplifiedStatementDto {
  companyName: string;
  businessNumber: string;
  year: number;
  half: 1 | 2;
  periodStart: string;
  periodEnd: string;
  employees: SimplifiedStatementEmployeeDto[];
  totals: {
    totalPay: number;
    taxableIncome: number;
    totalNonTaxable: number;
    incomeTax: number;
    localIncomeTax: number;
  };
}

// 원천징수영수증
export interface WithholdingReceiptDto {
  company: {
    name: string;
    businessNumber: string;
    representativeName: string;
    corporateRegistrationNumber: string | null;
    address: string | null;
  };
  employee: {
    name: string;
    employeeNumber: string;
    residentNumberMasked: string;
    departmentName: string;
    joinDate: string | null;
    resignDate: string | null;
  };
  year: number;
  monthly: Array<{
    month: number;
    totalPay: number;
    taxableIncome: number;
    totalNonTaxable: number;
    nationalPension: number;
    healthInsurance: number;
    longTermCare: number;
    employmentInsurance: number;
    incomeTax: number;
    localIncomeTax: number;
  }>;
  annual: {
    totalPay: number;
    taxableIncome: number;
    totalNonTaxable: number;
    nationalPension: number;
    healthInsurance: number;
    longTermCare: number;
    employmentInsurance: number;
    incomeTax: number;
    localIncomeTax: number;
  };
}

// 연간 누적 요약
export interface AnnualTaxSummaryDto {
  year: number;
  annualTotalPay: number;
  annualTaxableIncome: number;
  annualTotalNonTaxable: number;
  annualNationalPension: number;
  annualHealthInsurance: number;
  annualLongTermCare: number;
  annualEmploymentInsurance: number;
  annualIncomeTax: number;
  annualLocalIncomeTax: number;
}

// 월별 납부서
export interface MonthlyTaxPaymentDto {
  month: number;
  incomeTax: number;
  localIncomeTax: number;
  totalTax: number;
  incomeTaxDueDate: string;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  employerNationalPension: number;
  employerHealthInsurance: number;
  employerLongTermCare: number;
  employerEmploymentInsurance: number;
  totalInsurance: number;
  insuranceDueDate: string;
}
