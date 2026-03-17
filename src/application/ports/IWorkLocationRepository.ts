export interface WorkLocationDto {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface CreateWorkLocationData {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  isDefault?: boolean;
}

export interface UpdateWorkLocationData {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface IWorkLocationRepository {
  findAll(companyId: string): Promise<WorkLocationDto[]>;
  findAllActive(companyId: string): Promise<WorkLocationDto[]>;
  findById(companyId: string, id: string): Promise<WorkLocationDto | null>;
  create(companyId: string, data: CreateWorkLocationData): Promise<WorkLocationDto>;
  update(companyId: string, id: string, data: UpdateWorkLocationData): Promise<WorkLocationDto | null>;
  softDelete(companyId: string, id: string): Promise<void>;
}
