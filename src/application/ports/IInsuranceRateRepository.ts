export interface InsuranceRateDto {
  id: string;
  type: string;
  employeeRate: number;
  employerRate: number;
  minBase: number | null;
  maxBase: number | null;
  effectiveStartDate: string;
  effectiveEndDate: string;
  description: string | null;
  createdAt: string;
}

export interface CreateInsuranceRateData {
  type: string;
  employeeRate: number;
  employerRate: number;
  minBase?: number;
  maxBase?: number;
  effectiveStartDate: string;
  effectiveEndDate: string;
  description?: string;
}

export interface IInsuranceRateRepository {
  findByDateAndType(type: string, date: Date): Promise<InsuranceRateDto | null>;
  findAllByDate(date: Date): Promise<InsuranceRateDto[]>;
  findAll(): Promise<InsuranceRateDto[]>;
  create(data: CreateInsuranceRateData): Promise<InsuranceRateDto>;
  update(id: string, data: Partial<CreateInsuranceRateData>): Promise<InsuranceRateDto>;
  delete(id: string): Promise<void>;
}
