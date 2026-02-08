import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const calculatePayrollSchema = z.object({
  year: z.number().int().min(2020).max(currentYear + 1),
  month: z.number().int().min(1).max(12),
});

export const confirmPayrollSchema = z.object({
  year: z.number().int().min(2020).max(currentYear + 1),
  month: z.number().int().min(1).max(12),
});

export type CalculatePayrollInput = z.infer<typeof calculatePayrollSchema>;
export type ConfirmPayrollInput = z.infer<typeof confirmPayrollSchema>;
