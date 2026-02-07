export interface EmployeeSalaryItemDto {
  id: string;
  companyId: string;
  userId: string;
  code: string;
  name: string;
  type: string;
  paymentType: string;
  paymentCycle: string;
  amount: number;
  isOrdinaryWage: boolean;
  isTaxExempt: boolean;
  taxExemptCode: string | null;
  isActive: boolean;
  sortOrder: number;
  formula: string | null;
}

export interface CreateEmployeeSalaryItemData {
  companyId: string;
  userId: string;
  code: string;
  name: string;
  type: string;
  paymentType?: string;
  paymentCycle?: string;
  amount?: number;
  isOrdinaryWage?: boolean;
  isTaxExempt?: boolean;
  taxExemptCode?: string;
  isActive?: boolean;
  sortOrder?: number;
  formula?: string;
}

export interface IEmployeeSalaryItemRepository {
  findByEmployee(companyId: string, userId: string): Promise<EmployeeSalaryItemDto[]>;
  findActiveByEmployee(companyId: string, userId: string): Promise<EmployeeSalaryItemDto[]>;
  create(data: CreateEmployeeSalaryItemData): Promise<EmployeeSalaryItemDto>;
  createMany(data: CreateEmployeeSalaryItemData[]): Promise<number>;
  update(id: string, data: Partial<CreateEmployeeSalaryItemData>): Promise<EmployeeSalaryItemDto>;
  softDelete(id: string): Promise<void>;
  deleteByEmployee(companyId: string, userId: string): Promise<void>;
}
