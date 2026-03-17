import type {
  IWorkLocationRepository,
  WorkLocationDto,
  CreateWorkLocationData,
  UpdateWorkLocationData,
} from '../../ports/IWorkLocationRepository';

export class CrudWorkLocationUseCase {
  constructor(private workLocationRepo: IWorkLocationRepository) {}

  async list(companyId: string, includeInactive?: boolean): Promise<WorkLocationDto[]> {
    if (includeInactive) {
      return this.workLocationRepo.findAll(companyId);
    }
    return this.workLocationRepo.findAllActive(companyId);
  }

  async getById(companyId: string, id: string): Promise<WorkLocationDto | null> {
    return this.workLocationRepo.findById(companyId, id);
  }

  async create(companyId: string, data: CreateWorkLocationData): Promise<WorkLocationDto> {
    return this.workLocationRepo.create(companyId, data);
  }

  async update(companyId: string, id: string, data: UpdateWorkLocationData): Promise<WorkLocationDto | null> {
    return this.workLocationRepo.update(companyId, id, data);
  }

  async delete(companyId: string, id: string): Promise<void> {
    return this.workLocationRepo.softDelete(companyId, id);
  }
}
