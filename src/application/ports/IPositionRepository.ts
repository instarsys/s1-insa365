export interface PositionDto {
  id: string;
  companyId: string;
  name: string;
  level: number;
}

export interface CreatePositionData {
  name: string;
  level?: number;
}

export interface IPositionRepository {
  findById(companyId: string, id: string): Promise<PositionDto | null>;
  findAll(companyId: string): Promise<PositionDto[]>;
  create(companyId: string, data: CreatePositionData): Promise<PositionDto>;
  update(companyId: string, id: string, data: Partial<CreatePositionData>): Promise<PositionDto>;
  softDelete(companyId: string, id: string): Promise<void>;
  createMany(companyId: string, data: CreatePositionData[]): Promise<number>;
}
