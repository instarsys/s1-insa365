import type { EmployeeDto, EmployeeListFilters, CreateEmployeeDto, UpdateEmployeeDto } from '../dtos/employee';
import type { PaginatedResult } from '../dtos/common';

export interface IEmployeeRepository {
  findById(companyId: string, id: string): Promise<EmployeeDto | null>;
  findAll(companyId: string, filters: EmployeeListFilters): Promise<PaginatedResult<EmployeeDto>>;
  create(companyId: string, data: CreateEmployeeDto & { employeeNumber: string }): Promise<EmployeeDto>;
  update(companyId: string, id: string, data: UpdateEmployeeDto): Promise<EmployeeDto>;
  softDelete(companyId: string, id: string, resignDate?: Date, resignReason?: string): Promise<void>;
  terminate(companyId: string, id: string, resignDate: Date, resignReason?: string): Promise<void>;
  findByEmail(companyId: string, email: string): Promise<EmployeeDto | null>;
  getNextEmployeeNumber(companyId: string, prefix: string): Promise<string>;
  countByStatus(companyId: string, status: string): Promise<number>;
  rehire(companyId: string, id: string, rehireDate?: Date): Promise<void>;
}
