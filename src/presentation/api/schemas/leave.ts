import { z } from 'zod';

export const createLeaveRequestSchema = z.object({
  type: z.enum(['ANNUAL', 'HALF_DAY_AM', 'HALF_DAY_PM', 'SICK', 'FAMILY_EVENT', 'UNPAID', 'OTHER']),
  startDate: z.string().min(1, '시작일을 입력해주세요.'),
  endDate: z.string().min(1, '종료일을 입력해주세요.'),
  days: z.number().min(0.5).max(365),
  reason: z.string().max(500).optional().nullable(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
