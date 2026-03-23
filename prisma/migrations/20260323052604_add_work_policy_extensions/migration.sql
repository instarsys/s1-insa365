-- AlterTable
ALTER TABLE "work_policies" ADD COLUMN     "attendance_calc_mode" TEXT NOT NULL DEFAULT 'TIME_BASED',
ADD COLUMN     "break_schedule" JSONB,
ADD COLUMN     "break_type" TEXT NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "check_in_allowed_minutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "check_out_allowed_minutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "overtime_min_threshold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overtime_rounding_minutes" INTEGER NOT NULL DEFAULT 0;
