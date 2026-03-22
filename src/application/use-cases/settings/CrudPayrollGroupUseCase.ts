import { ValidationError } from '@/domain/errors/ValidationError';

interface IPayrollGroupRepository {
  findAll(companyId: string): Promise<unknown[]>;
  findById(companyId: string, id: string): Promise<unknown | null>;
  findDefault(companyId: string): Promise<unknown | null>;
  create(data: {
    companyId: string;
    name: string;
    code?: string;
    payDay?: number;
    description?: string;
    sortOrder?: number;
    isDefault?: boolean;
  }): Promise<unknown>;
  update(companyId: string, id: string, data: {
    name?: string;
    code?: string;
    payDay?: number;
    description?: string;
    sortOrder?: number;
    isDefault?: boolean;
    isActive?: boolean;
  }): Promise<unknown | null>;
  softDelete(companyId: string, id: string): Promise<unknown | null>;
  addManager(companyId: string, payrollGroupId: string, userId: string): Promise<unknown>;
  removeManager(companyId: string, payrollGroupId: string, userId: string): Promise<unknown | null>;
  assignMembers(companyId: string, payrollGroupId: string, userIds: string[]): Promise<unknown>;
  unassignMembers(companyId: string, userIds: string[]): Promise<unknown>;
  getMembers(companyId: string, payrollGroupId: string): Promise<unknown[]>;
}

export class CrudPayrollGroupUseCase {
  constructor(private readonly repo: IPayrollGroupRepository) {}

  async list(companyId: string) {
    return this.repo.findAll(companyId);
  }

  async getById(companyId: string, id: string) {
    return this.repo.findById(companyId, id);
  }

  async create(companyId: string, data: {
    name: string;
    code?: string;
    payDay?: number;
    description?: string;
    sortOrder?: number;
  }) {
    if (!data.name?.trim()) {
      throw new ValidationError('그룹 이름을 입력해주세요.');
    }
    if (data.payDay !== undefined && (data.payDay < 1 || data.payDay > 31)) {
      throw new ValidationError('급여일은 1~31 사이의 값이어야 합니다.');
    }
    return this.repo.create({ companyId, ...data });
  }

  async update(companyId: string, id: string, data: {
    name?: string;
    code?: string;
    payDay?: number;
    description?: string;
    sortOrder?: number;
    isDefault?: boolean;
    isActive?: boolean;
  }) {
    if (data.payDay !== undefined && (data.payDay < 1 || data.payDay > 31)) {
      throw new ValidationError('급여일은 1~31 사이의 값이어야 합니다.');
    }
    const result = await this.repo.update(companyId, id, data);
    if (!result) {
      throw new ValidationError('해당 급여 그룹을 찾을 수 없습니다.');
    }
    return result;
  }

  async delete(companyId: string, id: string) {
    const result = await this.repo.softDelete(companyId, id);
    if (!result) {
      throw new ValidationError('기본 그룹은 삭제할 수 없거나 해당 그룹을 찾을 수 없습니다.');
    }
    return result;
  }

  async addManager(companyId: string, payrollGroupId: string, userId: string) {
    return this.repo.addManager(companyId, payrollGroupId, userId);
  }

  async removeManager(companyId: string, payrollGroupId: string, userId: string) {
    return this.repo.removeManager(companyId, payrollGroupId, userId);
  }

  async assignMembers(companyId: string, payrollGroupId: string, userIds: string[]) {
    if (!userIds.length) {
      throw new ValidationError('배정할 직원을 선택해주세요.');
    }
    return this.repo.assignMembers(companyId, payrollGroupId, userIds);
  }

  async unassignMembers(companyId: string, userIds: string[]) {
    return this.repo.unassignMembers(companyId, userIds);
  }

  async getMembers(companyId: string, payrollGroupId: string) {
    return this.repo.getMembers(companyId, payrollGroupId);
  }
}
