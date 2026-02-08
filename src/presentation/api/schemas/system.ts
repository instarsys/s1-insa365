import { z } from 'zod';

export const createInsuranceRateSchema = z.object({
  type: z.enum(['NATIONAL_PENSION', 'HEALTH_INSURANCE', 'LONG_TERM_CARE', 'EMPLOYMENT_INSURANCE']),
  employeeRate: z.number().min(0).max(1),
  employerRate: z.number().min(0).max(1),
  minBase: z.number().int().min(0).optional().nullable(),
  maxBase: z.number().int().min(0).optional().nullable(),
  effectiveStartDate: z.string().min(1, '적용 시작일을 입력해주세요.'),
  effectiveEndDate: z.string().min(1, '적용 종료일을 입력해주세요.'),
  description: z.string().max(200).optional().nullable(),
});

export type CreateInsuranceRateInput = z.infer<typeof createInsuranceRateSchema>;
