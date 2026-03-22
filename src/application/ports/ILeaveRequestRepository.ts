import type { LeaveRequestDto, LeaveFilters, CreateLeaveRequestDto } from '../dtos/leave';

export interface ILeaveRequestRepository {
  findById(companyId: string, id: string): Promise<LeaveRequestDto | null>;
  findAll(companyId: string, filters: LeaveFilters): Promise<LeaveRequestDto[]>;
  create(companyId: string, data: CreateLeaveRequestDto): Promise<LeaveRequestDto>;
  updateStatus(
    id: string,
    status: string,
    updatedBy: string,
    rejectReason?: string,
  ): Promise<LeaveRequestDto>;
  countPending(companyId: string): Promise<number>;
  findApprovedByPeriod(companyId: string, userId: string, startDate: Date, endDate: Date): Promise<LeaveRequestDto[]>;
  findPendingByPeriod(companyId: string, startDate: Date, endDate: Date): Promise<LeaveRequestDto[]>;
}
