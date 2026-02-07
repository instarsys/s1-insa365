import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { IEmployeeSalaryItemRepository, EmployeeSalaryItemDto } from '../../ports/IEmployeeSalaryItemRepository';
import type { EmployeeDto } from '../../dtos/employee';
import { EntityNotFoundError } from '@domain/errors';

export interface EmployeeDetailDto {
  employee: EmployeeDto;
  salaryItems: EmployeeSalaryItemDto[];
}

export class GetEmployeeDetailUseCase {
  constructor(
    private employeeRepo: IEmployeeRepository,
    private employeeSalaryItemRepo: IEmployeeSalaryItemRepository,
  ) {}

  async execute(companyId: string, id: string): Promise<EmployeeDetailDto> {
    const employee = await this.employeeRepo.findById(companyId, id);
    if (!employee) {
      throw new EntityNotFoundError('Employee', id);
    }

    const salaryItems = await this.employeeSalaryItemRepo.findByEmployee(companyId, id);

    return { employee, salaryItems };
  }
}
