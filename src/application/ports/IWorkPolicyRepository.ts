export interface WorkPolicyDto {
  id: string;
  companyId: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workDays: string;
  isDefault: boolean;
  // Company에서 이동된 필드
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
  nightWorkStartTime: string;
  nightWorkEndTime: string;
  overtimeThresholdMinutes: number;
  monthlyWorkHours: number;
  // 신규 필드
  weeklyHoliday: string;
  weeklyWorkHours: number;
  weeklyOvertimeLimit: number;
  monthlyOvertimeLimit: number;
  // 연장근로 적용 설정
  checkInAllowedMinutes?: number;
  checkOutAllowedMinutes?: number;
  overtimeMinThreshold?: number;
  overtimeRoundingMinutes?: number;
  breakType?: string;
  breakSchedule?: unknown;
  attendanceCalcMode?: string;
}

export interface CreateWorkPolicyData {
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  workDays?: string;
  isDefault?: boolean;
  lateGraceMinutes?: number;
  earlyLeaveGraceMinutes?: number;
  nightWorkStartTime?: string;
  nightWorkEndTime?: string;
  overtimeThresholdMinutes?: number;
  monthlyWorkHours?: number;
  weeklyHoliday?: string;
  weeklyWorkHours?: number;
  weeklyOvertimeLimit?: number;
  monthlyOvertimeLimit?: number;
}

export interface IWorkPolicyRepository {
  findById(companyId: string, id: string): Promise<WorkPolicyDto | null>;
  findAll(companyId: string): Promise<WorkPolicyDto[]>;
  findDefault(companyId: string): Promise<WorkPolicyDto | null>;
  create(companyId: string, data: CreateWorkPolicyData): Promise<WorkPolicyDto>;
  update(companyId: string, id: string, data: Partial<CreateWorkPolicyData>): Promise<WorkPolicyDto>;
  softDelete(companyId: string, id: string): Promise<void>;
}
