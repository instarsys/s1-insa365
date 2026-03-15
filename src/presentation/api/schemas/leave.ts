import { z } from 'zod';

export const createLeaveRequestSchema = z.object({
  type: z.enum(['ANNUAL', 'HALF_DAY_AM', 'HALF_DAY_PM', 'SICK', 'FAMILY_EVENT', 'UNPAID', 'OTHER']),
  leaveTypeConfigId: z.string().uuid().optional().nullable(),
  startDate: z.string().min(1, '시작일을 입력해주세요.'),
  endDate: z.string().min(1, '종료일을 입력해주세요.'),
  days: z.number().min(0.5).max(365),
  reason: z.string().max(500).optional().nullable(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const createLeaveGroupSchema = z.object({
  name: z.string().min(1, '그룹명을 입력해주세요.').max(50),
  allowOveruse: z.boolean().optional().default(false),
  description: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});

export type CreateLeaveGroupInput = z.infer<typeof createLeaveGroupSchema>;

export const createLeaveTypeConfigSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(50),
  leaveGroupId: z.string().uuid().optional().nullable(),
  timeOption: z.enum(['FULL_DAY', 'HALF_DAY', 'HOURS']).optional().default('FULL_DAY'),
  paidHours: z.number().min(0).max(24).optional().default(8),
  deductionDays: z.number().min(0).max(365).optional().default(1),
  deductsFromBalance: z.boolean().optional().default(true),
  requiresApproval: z.boolean().optional().default(true),
  maxConsecutiveDays: z.number().int().positive().optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});

export type CreateLeaveTypeConfigInput = z.infer<typeof createLeaveTypeConfigSchema>;

export const createLeaveAccrualRuleSchema = z.object({
  name: z.string().min(1).max(100),
  leaveGroupId: z.string().uuid(),
  accrualBasis: z.enum(['JOIN_DATE', 'FISCAL_YEAR']),
  accrualUnit: z.enum(['MONTHLY', 'YEARLY']),
  proRataFirstYear: z.boolean().optional().default(false),
  description: z.string().max(500).optional().nullable(),
  tiers: z.array(z.object({
    serviceMonthFrom: z.number().int().min(0),
    serviceMonthTo: z.number().int().min(0),
    accrualDays: z.number().min(0),
    validMonths: z.number().int().positive().optional().nullable(),
    sortOrder: z.number().int().optional().default(0),
  })).min(1, '최소 1개 이상의 단계가 필요합니다.'),
});

export type CreateLeaveAccrualRuleInput = z.infer<typeof createLeaveAccrualRuleSchema>;

export const generateAccrualsSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  ruleId: z.string().uuid().optional(),
});

export type GenerateAccrualsInput = z.infer<typeof generateAccrualsSchema>;

export const manualAdjustmentSchema = z.object({
  userId: z.string().uuid('유효한 사용자 ID가 필요합니다.'),
  year: z.number().int().min(2020).max(2100),
  days: z.number().refine((v) => v !== 0, '0일은 입력할 수 없습니다.'),
  reason: z.string().min(1, '사유를 입력해주세요.').max(500),
  leaveTypeConfigId: z.string().uuid('휴가 유형을 선택해주세요.'),
});

export type ManualAdjustmentInput = z.infer<typeof manualAdjustmentSchema>;
