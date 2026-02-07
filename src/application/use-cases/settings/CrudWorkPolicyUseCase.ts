import type { IWorkPolicyRepository, WorkPolicyDto, CreateWorkPolicyData } from '../../ports/IWorkPolicyRepository';
import { EntityNotFoundError } from '@domain/errors';

export class CrudWorkPolicyUseCase {
  constructor(private workPolicyRepo: IWorkPolicyRepository) {}

  async list(companyId: string): Promise<WorkPolicyDto[]> {
    return this.workPolicyRepo.findAll(companyId);
  }

  async get(companyId: string, id: string): Promise<WorkPolicyDto> {
    const policy = await this.workPolicyRepo.findById(companyId, id);
    if (!policy) {
      throw new EntityNotFoundError('WorkPolicy', id);
    }
    return policy;
  }

  async create(companyId: string, data: CreateWorkPolicyData): Promise<WorkPolicyDto> {
    return this.workPolicyRepo.create(companyId, data);
  }

  async update(companyId: string, id: string, data: Partial<CreateWorkPolicyData>): Promise<WorkPolicyDto> {
    const existing = await this.workPolicyRepo.findById(companyId, id);
    if (!existing) {
      throw new EntityNotFoundError('WorkPolicy', id);
    }
    return this.workPolicyRepo.update(companyId, id, data);
  }

  async delete(companyId: string, id: string): Promise<void> {
    const existing = await this.workPolicyRepo.findById(companyId, id);
    if (!existing) {
      throw new EntityNotFoundError('WorkPolicy', id);
    }
    await this.workPolicyRepo.softDelete(companyId, id);
  }
}
