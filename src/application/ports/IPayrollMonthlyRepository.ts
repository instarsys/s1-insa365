export interface PayrollMonthlyDto {
  id: string;
  companyId: string;
  userId: string;
  year: number;
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
  netPay: number;
}

export interface CreatePayrollMonthlyData {
  companyId: string;
  userId: string;
  year: number;
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
  netPay: number;
}

export interface IPayrollMonthlyRepository {
  findByEmployeeAndPeriod(companyId: string, userId: string, year: number, month: number): Promise<PayrollMonthlyDto | null>;
  findByEmployeeAndYear(companyId: string, userId: string, year: number): Promise<PayrollMonthlyDto[]>;
  create(data: CreatePayrollMonthlyData): Promise<PayrollMonthlyDto>;
  createMany(data: CreatePayrollMonthlyData[]): Promise<number>;
  deleteByPeriod(companyId: string, year: number, month: number): Promise<void>;
  upsert(companyId: string, userId: string, year: number, month: number, data: CreatePayrollMonthlyData): Promise<PayrollMonthlyDto>;
}
