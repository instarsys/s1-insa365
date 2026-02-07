import type { ILeaveRequestRepository } from '../../ports/ILeaveRequestRepository';
import type { ILeaveBalanceRepository } from '../../ports/ILeaveBalanceRepository';
import type { LeaveRequestDto } from '../../dtos/leave';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

export class ApproveLeaveRequestUseCase {
  constructor(
    private leaveRequestRepo: ILeaveRequestRepository,
    private leaveBalanceRepo: ILeaveBalanceRepository,
  ) {}

  async execute(companyId: string, requestId: string, approvedBy: string): Promise<LeaveRequestDto> {
    const request = await this.leaveRequestRepo.findById(companyId, requestId);
    if (!request) {
      throw new EntityNotFoundError('LeaveRequest', requestId);
    }

    if (request.status !== 'PENDING') {
      throw new ValidationError('Leave request is not in pending status');
    }

    const updated = await this.leaveRequestRepo.updateStatus(requestId, 'APPROVED', approvedBy);

    // Deduct from leave balance for applicable types
    if (request.type === 'ANNUAL' || request.type === 'HALF_DAY_AM' || request.type === 'HALF_DAY_PM') {
      const year = new Date(request.startDate).getFullYear();
      await this.leaveBalanceRepo.adjustUsedDays(companyId, request.userId, year, request.days);
    }

    return updated;
  }
}
