export interface DepartmentDto {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  parentId: string | null;
  sortOrder: number;
}

export interface CreateDepartmentData {
  name: string;
  code?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface IDepartmentRepository {
  findById(companyId: string, id: string): Promise<DepartmentDto | null>;
  findAll(companyId: string): Promise<DepartmentDto[]>;
  create(companyId: string, data: CreateDepartmentData): Promise<DepartmentDto>;
  update(companyId: string, id: string, data: Partial<CreateDepartmentData>): Promise<DepartmentDto>;
  softDelete(companyId: string, id: string): Promise<void>;
  createMany(companyId: string, data: CreateDepartmentData[]): Promise<number>;
}
