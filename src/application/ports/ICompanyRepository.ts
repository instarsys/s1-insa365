export interface CompanyDto {
  id: string;
  name: string;
  businessNumber: string;
  representativeName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  payDay: number;
  monthlyWorkHours: number;
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  nightWorkStartTime: string;
  nightWorkEndTime: string;
  overtimeThresholdMinutes: number;
  prorationMethod: string;
  subscriptionPlan: string;
  createdAt: string;
}

export interface CreateCompanyData {
  name: string;
  businessNumber: string;
  representativeName: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdateCompanyData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  payDay?: number;
  monthlyWorkHours?: number;
  lateGraceMinutes?: number;
  earlyLeaveGraceMinutes?: number;
  nightWorkStartTime?: string;
  nightWorkEndTime?: string;
  overtimeThresholdMinutes?: number;
  prorationMethod?: string;
}

export interface ICompanyRepository {
  findById(id: string): Promise<CompanyDto | null>;
  create(data: CreateCompanyData): Promise<CompanyDto>;
  update(id: string, data: UpdateCompanyData): Promise<CompanyDto>;
}
