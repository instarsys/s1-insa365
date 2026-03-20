/**
 * Leave-related DTOs.
 */

export interface CreateLeaveRequestDto {
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}

export interface ApproveLeaveDto {
  approvedBy: string;
}

export interface RejectLeaveDto {
  rejectedBy: string;
  rejectReason?: string;
}

export interface LeaveRequestDto {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  departmentName: string | null;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
}

export interface LeaveBalanceDto {
  id: string;
  userId: string;
  userName: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface GrantLeaveDto {
  userId: string;
  leaveTypeConfigId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}

export interface LeaveFilters {
  userId?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
