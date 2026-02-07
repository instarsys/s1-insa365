import type { ISalaryRuleRepository, SalaryRuleDto, CreateSalaryRuleData } from '../../ports/ISalaryRuleRepository';
import { EntityNotFoundError } from '@domain/errors';

export class CrudSalaryRulesUseCase {
  constructor(private salaryRuleRepo: ISalaryRuleRepository) {}

  async list(companyId: string): Promise<SalaryRuleDto[]> {
    return this.salaryRuleRepo.findAll(companyId);
  }

  async get(companyId: string, id: string): Promise<SalaryRuleDto> {
    const rule = await this.salaryRuleRepo.findById(companyId, id);
    if (!rule) {
      throw new EntityNotFoundError('SalaryRule', id);
    }
    return rule;
  }

  async create(companyId: string, data: CreateSalaryRuleData): Promise<SalaryRuleDto> {
    return this.salaryRuleRepo.create(companyId, data);
  }

  async update(companyId: string, id: string, data: Partial<CreateSalaryRuleData>): Promise<SalaryRuleDto> {
    const existing = await this.salaryRuleRepo.findById(companyId, id);
    if (!existing) {
      throw new EntityNotFoundError('SalaryRule', id);
    }
    return this.salaryRuleRepo.update(companyId, id, data);
  }

  async delete(companyId: string, id: string): Promise<void> {
    const existing = await this.salaryRuleRepo.findById(companyId, id);
    if (!existing) {
      throw new EntityNotFoundError('SalaryRule', id);
    }
    await this.salaryRuleRepo.softDelete(companyId, id);
  }
}
