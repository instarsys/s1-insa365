export interface CompanyDto {
  id: string;
  name: string;
  businessNumber: string;
  representativeName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  payDay: number;
  prorationMethod: string;
  subscriptionPlan: string;
  gpsEnforcementMode: string;
  logoUrl: string | null;
  sealUrl: string | null;
  corporateRegistrationNumber: string | null;
  businessType: string | null;
  businessCategory: string | null;
  taxOfficeCode: string | null;
  taxOfficeName: string | null;
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
  representativeName?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  payDay?: number;
  prorationMethod?: string;
  gpsEnforcementMode?: string;
  logoUrl?: string | null;
  sealUrl?: string | null;
  corporateRegistrationNumber?: string;
  businessType?: string;
  businessCategory?: string;
  taxOfficeCode?: string;
  taxOfficeName?: string;
}

export interface ICompanyRepository {
  findById(id: string): Promise<CompanyDto | null>;
  create(data: CreateCompanyData): Promise<CompanyDto>;
  update(id: string, data: UpdateCompanyData): Promise<CompanyDto>;
}
