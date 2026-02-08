import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const checkInSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const confirmAttendanceSchema = z.object({
  year: z.number().int().min(2020).max(currentYear + 1),
  month: z.number().int().min(1).max(12),
  userIds: z.array(z.string().uuid()).optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type ConfirmAttendanceInput = z.infer<typeof confirmAttendanceSchema>;
