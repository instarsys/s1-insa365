import type { ILeaveRequestRepository } from '../../ports/ILeaveRequestRepository';
import type { ILeaveBalanceRepository } from '../../ports/ILeaveBalanceRepository';
import type { CreateLeaveRequestDto, LeaveRequestDto } from '../../dtos/leave';
import { ValidationError } from '@domain/errors';

export class CreateLeaveRequestUseCase {
  constructor(
    private leaveRequestRepo: ILeaveRequestRepository,
    private leaveBalanceRepo: ILeaveBalanceRepository,
  ) {}

  async execute(companyId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequestDto> {
    // For annual leave, check remaining balance
    if (dto.type === 'ANNUAL' || dto.type === 'HALF_DAY_AM' || dto.type === 'HALF_DAY_PM') {
      const year = new Date(dto.startDate).getFullYear();
      const balance = await this.leaveBalanceRepo.findByEmployeeAndYear(companyId, dto.userId, year);

      if (balance && balance.remainingDays < dto.days) {
        throw new ValidationError(
          `Insufficient leave balance. Remaining: ${balance.remainingDays}, Requested: ${dto.days}`,
        );
      }
    }

    return this.leaveRequestRepo.create(companyId, dto);
  }
}
