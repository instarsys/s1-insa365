import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { EmployeeDto, EmployeeListFilters } from '../../dtos/employee';
import type { PaginatedResult } from '../../dtos/common';

export class ListEmployeesUseCase {
  constructor(private employeeRepo: IEmployeeRepository) {}

  async execute(companyId: string, filters: EmployeeListFilters): Promise<PaginatedResult<EmployeeDto>> {
    return this.employeeRepo.findAll(companyId, {
      ...filters,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    });
  }
}
