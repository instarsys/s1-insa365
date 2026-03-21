import type { ILeaveRequestRepository } from '../../ports/ILeaveRequestRepository';
import type { LeaveRequestDto } from '../../dtos/leave';
import { EntityNotFoundError, ValidationError } from '@domain/errors';

export class RejectLeaveRequestUseCase {
  constructor(private leaveRequestRepo: ILeaveRequestRepository) {}

  async execute(companyId: string, requestId: string, rejectedBy: string, rejectReason?: string): Promise<LeaveRequestDto> {
    const request = await this.leaveRequestRepo.findById(companyId, requestId);
    if (!request) {
      throw new EntityNotFoundError('LeaveRequest', requestId);
    }

    if (request.status !== 'PENDING') {
      throw new ValidationError('대기 중인 신청만 반려할 수 있습니다.');
    }

    return this.leaveRequestRepo.updateStatus(requestId, 'REJECTED', rejectedBy, rejectReason);
  }
}
