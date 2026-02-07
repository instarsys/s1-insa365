import type { ICompanyRepository, CompanyDto } from '../../ports/ICompanyRepository';
import { EntityNotFoundError } from '@domain/errors';

export class GetCompanySettingsUseCase {
  constructor(private companyRepo: ICompanyRepository) {}

  async execute(companyId: string): Promise<CompanyDto> {
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new EntityNotFoundError('Company', companyId);
    }
    return company;
  }
}
