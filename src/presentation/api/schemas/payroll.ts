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
  payrollGroupId: z.string().uuid(),
});

export type CalculatePayrollInput = z.infer<typeof calculatePayrollSchema>;
export type ConfirmPayrollInput = z.infer<typeof confirmPayrollSchema>;
export type CancelPayrollInput = z.infer<typeof cancelPayrollSchema>;
