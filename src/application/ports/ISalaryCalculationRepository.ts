import type { PayrollResultDto, PayrollHistoryDto, PayrollSpreadsheetRowDto, PayrollLedgerRowDto } from '../dtos/payroll';
import type { PaginatedResult } from '../dtos/common';

export interface CreateSalaryCalculationData {
  companyId: string;
  userId: string;
  year: number;
  month: number;
  status: string;
  ordinaryWageMonthly: number;
  ordinaryWageHourly: number;
  basePay: number;
  fixedAllowances: number;
  overtimePay: number;
  nightPay: number;
  nightOvertimePay: number;
  holidayPay: number;
  holidayOvertimePay: number;
  holidayNightPay: number;
  holidayNightOvertimePay: number;
  variableAllowances: number;
  attendanceDeductions: number;
  totalPay: number;
  totalNonTaxable: number;
  taxableIncome: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localIncomeTax: number;
  totalDeduction: number;
  netPay: number;
  payItemsSnapshot?: unknown;
  deductionItemsSnapshot?: unknown;
  insuranceRatesSnapshot?: unknown;
  prorationApplied: boolean;
  prorationRatio?: number;
  minimumWageWarning: boolean;
  errorMessage?: string;
}

export interface ISalaryCalculationRepository {
  findByPeriod(companyId: string, year: number, month: number): Promise<PayrollResultDto[]>;
  findByEmployeeAndPeriod(companyId: string, userId: string, year: number, month: number): Promise<PayrollResultDto | null>;
  create(data: CreateSalaryCalculationData): Promise<PayrollResultDto>;
  createMany(data: CreateSalaryCalculationData[]): Promise<number>;
  update(companyId: string, id: string, data: Partial<CreateSalaryCalculationData>): Promise<PayrollResultDto | null>;
  updateStatus(companyId: string, year: number, month: number, status: string, confirmedBy?: string): Promise<void>;
  deleteByPeriod(companyId: string, year: number, month: number): Promise<void>;
  deleteByPeriodAndUserIds(companyId: string, year: number, month: number, userIds: string[]): Promise<void>;
  updateStatusByUserIds(companyId: string, year: number, month: number, userIds: string[], status: string, confirmedBy?: string): Promise<void>;
  getSpreadsheet(companyId: string, year: number, month: number): Promise<PayrollSpreadsheetRowDto[]>;
  getLedger(companyId: string, year: number, month: number): Promise<PayrollLedgerRowDto[]>;
  getHistory(companyId: string, page?: number, limit?: number): Promise<PaginatedResult<PayrollHistoryDto>>;
  getSummary(companyId: string, year: number, month: number): Promise<{
    totalEmployees: number;
    calculatedCount: number;
    confirmedCount: number;
    failedCount: number;
    skippedCount: number;
    totalPay: number;
    totalDeduction: number;
    totalNetPay: number;
    status: string;
  } | null>;
  findByIdWithDetails(companyId: string, id: string, userId?: string): Promise<PayrollResultDto | null>;
}
