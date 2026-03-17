export interface CompanyHolidayDto {
  id: string;
  companyId: string;
  date: Date;
  name: string;
  type: string;
  isRecurring: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyHolidayData {
  companyId: string;
  date: Date;
  name: string;
  type: string;
  isRecurring: boolean;
}

export interface ICompanyHolidayRepository {
  findByYear(companyId: string, year: number): Promise<CompanyHolidayDto[]>;
  findByPeriod(companyId: string, startDate: Date, endDate: Date): Promise<CompanyHolidayDto[]>;
  create(data: CreateCompanyHolidayData): Promise<CompanyHolidayDto>;
  createMany(data: CreateCompanyHolidayData[]): Promise<number>;
  delete(companyId: string, id: string): Promise<void>;
}
