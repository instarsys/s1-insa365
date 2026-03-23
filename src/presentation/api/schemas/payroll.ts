import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const calculatePayrollSchema = z.object({
  year: z.number().int().min(2020).max(currentYear + 1),
  month: z.number().int().min(1).max(12),
  payrollGroupId: z.string().uuid(),
  employeeIds: z.array(z.string().uuid()).optional(),
});

export const confirmPayrollSchema = z.object({
  year: z.number().int().min(2020).max(currentYear + 1),
  month: z.number().int().min(1).max(12),
  payrollGroupId: z.string().uuid(),
});

export const cancelPayrollSchema = z.object({
  year: z.number().int().min(2020).max(currentYear + 1),
  month: z.number().int().min(1).max(12),
  payrollGroupId: z.string().uuid().optional(),
  force: z.boolean().optional(),
});

export const sendPayslipEmailSchema = z.object({
  year: z.number().int().min(2020).max(currentYear + 1),
  month: z.number().int().min(1).max(12),
  userIds: z.array(z.string().uuid()).min(1, '발송할 직원을 선택해주세요.'),
});

export type CalculatePayrollInput = z.infer<typeof calculatePayrollSchema>;
export type ConfirmPayrollInput = z.infer<typeof confirmPayrollSchema>;
export type CancelPayrollInput = z.infer<typeof cancelPayrollSchema>;
export type SendPayslipEmailInput = z.infer<typeof sendPayslipEmailSchema>;
