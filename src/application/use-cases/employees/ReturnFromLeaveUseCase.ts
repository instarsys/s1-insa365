import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

export class ReturnFromLeaveUseCase {
  constructor(private employeeRepo: IEmployeeRepository) {}

  async execute(companyId: string, id: string, params: { returnDate: string }): Promise<void> {
    const employee = await this.employeeRepo.findById(companyId, id);
    if (!employee) {
      throw new EntityNotFoundError('Employee', id);
    }

    if (employee.employeeStatus !== 'ON_LEAVE') {
      throw new ValidationError('휴직 상태에서만 복귀 처리할 수 있습니다.');
    }

    await this.employeeRepo.update(companyId, id, {
      employeeStatus: 'ACTIVE',
      leaveEndDate: new Date(params.returnDate),
    } as Record<string, unknown>);
  }
}
