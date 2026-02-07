import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

export class TerminateEmployeeUseCase {
  constructor(private employeeRepo: IEmployeeRepository) {}

  async execute(companyId: string, id: string, resignDate: string): Promise<void> {
    const employee = await this.employeeRepo.findById(companyId, id);
    if (!employee) {
      throw new EntityNotFoundError('Employee', id);
    }

    if (employee.employeeStatus === 'RESIGNED' || employee.employeeStatus === 'TERMINATED') {
      throw new ValidationError('Employee is already terminated');
    }

    await this.employeeRepo.softDelete(companyId, id, new Date(resignDate));
  }
}
