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
  payrollGroupId?: string | null;
  employeeName?: string | null;
  employeeNumber?: string | null;
  departmentName?: string | null;
  salaryType?: string | null;
  payItemsSnapshot?: unknown;
  deductionItemsSnapshot?: unknown;
  attendanceSnapshot?: unknown;
  snapshotMetadata?: unknown;
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
  payrollGroupId?: string | null;
  employeeName?: string | null;
  employeeNumber?: string | null;
  departmentName?: string | null;
  salaryType?: string | null;
  payItemsSnapshot?: unknown;
  deductionItemsSnapshot?: unknown;
  attendanceSnapshot?: unknown;
  snapshotMetadata?: unknown;
}

export interface IPayrollMonthlyRepository {
  findByEmployeeAndPeriod(companyId: string, userId: string, year: number, month: number): Promise<PayrollMonthlyDto | null>;
  findByEmployeeAndYear(companyId: string, userId: string, year: number): Promise<PayrollMonthlyDto[]>;
  findByPeriodAndGroup(companyId: string, year: number, month: number, payrollGroupId?: string): Promise<PayrollMonthlyDto[]>;
  create(data: CreatePayrollMonthlyData): Promise<PayrollMonthlyDto>;
  createMany(data: CreatePayrollMonthlyData[]): Promise<number>;
  deleteByPeriod(companyId: string, year: number, month: number): Promise<void>;
  deleteByPeriodAndUserIds(companyId: string, year: number, month: number, userIds: string[]): Promise<void>;
  upsert(companyId: string, userId: string, year: number, month: number, data: CreatePayrollMonthlyData): Promise<PayrollMonthlyDto>;
}
