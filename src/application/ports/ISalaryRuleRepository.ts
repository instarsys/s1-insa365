export interface SalaryRuleDto {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: string;
  paymentType: string;
  paymentCycle: string;
  defaultAmount: number | null;
  isOrdinaryWage: boolean;
  isTaxExempt: boolean;
  taxExemptCode: string | null;
  isActive: boolean;
  sortOrder: number;
  formula: string | null;
  description: string | null;
}

export interface CreateSalaryRuleData {
  code: string;
  name: string;
  type: string;
  paymentType?: string;
  paymentCycle?: string;
  defaultAmount?: number;
  isOrdinaryWage?: boolean;
  isTaxExempt?: boolean;
  taxExemptCode?: string;
  isActive?: boolean;
  sortOrder?: number;
  formula?: string;
  description?: string;
}

export interface ISalaryRuleRepository {
  findById(companyId: string, id: string): Promise<SalaryRuleDto | null>;
  findAll(companyId: string): Promise<SalaryRuleDto[]>;
  findActive(companyId: string): Promise<SalaryRuleDto[]>;
  create(companyId: string, data: CreateSalaryRuleData): Promise<SalaryRuleDto>;
  update(companyId: string, id: string, data: Partial<CreateSalaryRuleData>): Promise<SalaryRuleDto>;
  softDelete(companyId: string, id: string): Promise<void>;
  createMany(companyId: string, data: CreateSalaryRuleData[]): Promise<number>;
}
