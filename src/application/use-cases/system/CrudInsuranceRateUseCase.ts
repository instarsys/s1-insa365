import type { IInsuranceRateRepository, InsuranceRateDto, CreateInsuranceRateData } from '../../ports/IInsuranceRateRepository';

export class CrudInsuranceRateUseCase {
  constructor(private insuranceRateRepo: IInsuranceRateRepository) {}

  async list(): Promise<InsuranceRateDto[]> {
    return this.insuranceRateRepo.findAll();
  }

  async create(data: CreateInsuranceRateData): Promise<InsuranceRateDto> {
    return this.insuranceRateRepo.create(data);
  }

  async update(id: string, data: Partial<CreateInsuranceRateData>): Promise<InsuranceRateDto> {
    return this.insuranceRateRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.insuranceRateRepo.delete(id);
  }
}
