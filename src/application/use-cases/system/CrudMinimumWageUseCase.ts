import type { IMinimumWageRepository, MinimumWageDto, CreateMinimumWageData } from '../../ports/IMinimumWageRepository';
import { EntityNotFoundError } from '@domain/errors';

export class CrudMinimumWageUseCase {
  constructor(private minimumWageRepo: IMinimumWageRepository) {}

  async list(): Promise<MinimumWageDto[]> {
    return this.minimumWageRepo.findAll();
  }

  async getByYear(year: number): Promise<MinimumWageDto> {
    const wage = await this.minimumWageRepo.findByYear(year);
    if (!wage) {
      throw new EntityNotFoundError('MinimumWage', String(year));
    }
    return wage;
  }

  async create(data: CreateMinimumWageData): Promise<MinimumWageDto> {
    return this.minimumWageRepo.create(data);
  }

  async update(id: string, data: Partial<CreateMinimumWageData>): Promise<MinimumWageDto> {
    return this.minimumWageRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.minimumWageRepo.delete(id);
  }
}
