import type { ILeaveBalanceRepository } from '../../ports/ILeaveBalanceRepository';
import type { LeaveBalanceDto } from '../../dtos/leave';

export class GetLeaveBalanceUseCase {
  constructor(private leaveBalanceRepo: ILeaveBalanceRepository) {}

  async execute(companyId: string, userId: string, year: number): Promise<LeaveBalanceDto | null> {
    return this.leaveBalanceRepo.findByEmployeeAndYear(companyId, userId, year);
  }

  async executeAll(companyId: string, year: number): Promise<LeaveBalanceDto[]> {
    return this.leaveBalanceRepo.findAllByYear(companyId, year);
  }
}
