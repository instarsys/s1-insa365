export interface WorkPolicyDto {
  id: string;
  companyId: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workDays: string;
  isDefault: boolean;
}

export interface CreateWorkPolicyData {
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  workDays?: string;
  isDefault?: boolean;
}

export interface IWorkPolicyRepository {
  findById(companyId: string, id: string): Promise<WorkPolicyDto | null>;
  findAll(companyId: string): Promise<WorkPolicyDto[]>;
  findDefault(companyId: string): Promise<WorkPolicyDto | null>;
  create(companyId: string, data: CreateWorkPolicyData): Promise<WorkPolicyDto>;
  update(companyId: string, id: string, data: Partial<CreateWorkPolicyData>): Promise<WorkPolicyDto>;
  softDelete(companyId: string, id: string): Promise<void>;
}
