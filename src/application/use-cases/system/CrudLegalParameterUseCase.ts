import type { ILegalParameterRepository, LegalParameterDto, CreateLegalParameterData } from '../../ports/ILegalParameterRepository';
import { EntityNotFoundError } from '@domain/errors';

export class CrudLegalParameterUseCase {
  constructor(private legalParameterRepo: ILegalParameterRepository) {}

  async list(): Promise<LegalParameterDto[]> {
    return this.legalParameterRepo.findAll();
  }

  async listByCategory(category: string): Promise<LegalParameterDto[]> {
    return this.legalParameterRepo.findByCategory(category);
  }

  async getByKey(key: string): Promise<LegalParameterDto> {
    const param = await this.legalParameterRepo.findByKey(key);
    if (!param) {
      throw new EntityNotFoundError('LegalParameter', key);
    }
    return param;
  }

  async create(data: CreateLegalParameterData): Promise<LegalParameterDto> {
    return this.legalParameterRepo.create(data);
  }

  async update(id: string, data: Partial<CreateLegalParameterData>): Promise<LegalParameterDto> {
    return this.legalParameterRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.legalParameterRepo.delete(id);
  }
}
