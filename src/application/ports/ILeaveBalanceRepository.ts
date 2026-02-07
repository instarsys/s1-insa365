import type { LeaveBalanceDto } from '../dtos/leave';

export interface CreateLeaveBalanceData {
  companyId: string;
  userId: string;
  year: number;
  totalDays: number;
  usedDays?: number;
  remainingDays?: number;
}

export interface ILeaveBalanceRepository {
  findByEmployeeAndYear(companyId: string, userId: string, year: number): Promise<LeaveBalanceDto | null>;
  findAllByYear(companyId: string, year: number): Promise<LeaveBalanceDto[]>;
  create(data: CreateLeaveBalanceData): Promise<LeaveBalanceDto>;
  update(id: string, data: Partial<CreateLeaveBalanceData>): Promise<LeaveBalanceDto>;
  adjustUsedDays(companyId: string, userId: string, year: number, daysDelta: number): Promise<LeaveBalanceDto>;
}
