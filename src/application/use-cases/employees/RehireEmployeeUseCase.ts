import type { IEmployeeRepository } from '../../ports/IEmployeeRepository';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

export class RehireEmployeeUseCase {
  constructor(private employeeRepo: IEmployeeRepository) {}

  /**
   * @param cancel true이면 퇴직 취소(입사일 유지), false이면 재입사(새 입사일)
   */
  async execute(companyId: string, id: string, params: { rehireDate?: string; cancel?: boolean }): Promise<void> {
    const employee = await this.employeeRepo.findById(companyId, id);
    if (!employee) {
      throw new EntityNotFoundError('Employee', id);
    }

    if (employee.employeeStatus !== 'RESIGNED' && employee.employeeStatus !== 'TERMINATED') {
      throw new ValidationError('퇴직 상태에서만 재입사/퇴직취소 처리할 수 있습니다.');
    }

    if (params.cancel) {
      // 퇴직 취소: 입사일 유지, resignDate/resignReason만 초기화
      await this.employeeRepo.rehire(companyId, id);
    } else {
      if (!params.rehireDate) {
        throw new ValidationError('재입사일은 필수입니다.');
      }
      await this.employeeRepo.rehire(companyId, id, new Date(params.rehireDate));
    }
  }
}
