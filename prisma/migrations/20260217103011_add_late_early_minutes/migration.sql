-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "late_minutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "salary_attendance_data" ADD COLUMN     "total_early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_late_minutes" INTEGER NOT NULL DEFAULT 0;
