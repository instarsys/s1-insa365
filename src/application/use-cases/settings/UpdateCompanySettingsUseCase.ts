import type { ICompanyRepository, CompanyDto, UpdateCompanyData } from '../../ports/ICompanyRepository';
import { EntityNotFoundError } from '@domain/errors';

export class UpdateCompanySettingsUseCase {
  constructor(private companyRepo: ICompanyRepository) {}

  async execute(companyId: string, data: UpdateCompanyData): Promise<CompanyDto> {
    const existing = await this.companyRepo.findById(companyId);
    if (!existing) {
      throw new EntityNotFoundError('Company', companyId);
    }
    return this.companyRepo.update(companyId, data);
  }
}
