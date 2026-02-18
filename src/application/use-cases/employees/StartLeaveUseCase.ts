import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

export class StartLeaveUseCase {
  constructor(private employeeRepo: IEmployeeRepository) {}

  async execute(companyId: string, id: string, params: { leaveStartDate: string; leaveReason: string }): Promise<void> {
    const employee = await this.employeeRepo.findById(companyId, id);
    if (!employee) {
      throw new EntityNotFoundError('Employee', id);
    }

    if (employee.employeeStatus !== 'ACTIVE') {
      throw new ValidationError('재직 상태에서만 휴직 처리할 수 있습니다.');
    }

    await this.employeeRepo.update(companyId, id, {
      employeeStatus: 'ON_LEAVE',
      leaveStartDate: new Date(params.leaveStartDate),
      leaveReason: params.leaveReason,
      leaveEndDate: null,
    } as Record<string, unknown>);
  }
}
