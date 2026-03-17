import type {
  ICompanyHolidayRepository,
  CompanyHolidayDto,
  CreateCompanyHolidayData,
} from '../../ports/ICompanyHolidayRepository';

export class CrudCompanyHolidayUseCase {
  constructor(private companyHolidayRepo: ICompanyHolidayRepository) {}

  async list(companyId: string, year: number): Promise<CompanyHolidayDto[]> {
    return this.companyHolidayRepo.findByYear(companyId, year);
  }

  async create(companyId: string, data: { date: Date; name: string; type?: string; isRecurring?: boolean }): Promise<CompanyHolidayDto> {
    return this.companyHolidayRepo.create({
      companyId,
      date: data.date,
      name: data.name,
      type: data.type ?? 'COMPANY',
      isRecurring: data.isRecurring ?? false,
    });
  }

  async bulkCreate(companyId: string, items: Omit<CreateCompanyHolidayData, 'companyId'>[]): Promise<number> {
    return this.companyHolidayRepo.createMany(
      items.map((item) => ({ ...item, companyId })),
    );
  }

  async delete(companyId: string, id: string): Promise<void> {
    return this.companyHolidayRepo.delete(companyId, id);
  }
}
