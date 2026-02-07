import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import type { UpdateEmployeeDto, EmployeeDto } from '../../dtos/employee';
import { EntityNotFoundError } from '@domain/errors';

export class UpdateEmployeeUseCase {
  constructor(private employeeRepo: IEmployeeRepository) {}

  async execute(companyId: string, id: string, dto: UpdateEmployeeDto): Promise<EmployeeDto> {
    const existing = await this.employeeRepo.findById(companyId, id);
    if (!existing) {
      throw new EntityNotFoundError('Employee', id);
    }

    return this.employeeRepo.update(companyId, id, dto);
  }
}
