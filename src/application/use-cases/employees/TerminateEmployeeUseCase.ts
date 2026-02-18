import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

export class TerminateEmployeeUseCase {
  constructor(private employeeRepo: IEmployeeRepository) {}

  async execute(companyId: string, id: string, params: { resignDate: string; resignReason?: string }): Promise<void> {
    const employee = await this.employeeRepo.findById(companyId, id);
    if (!employee) {
      throw new EntityNotFoundError('Employee', id);
    }

    if (employee.employeeStatus === 'RESIGNED' || employee.employeeStatus === 'TERMINATED') {
      throw new ValidationError('이미 퇴직 처리된 직원입니다.');
    }

    await this.employeeRepo.terminate(companyId, id, new Date(params.resignDate), params.resignReason);
  }
}
