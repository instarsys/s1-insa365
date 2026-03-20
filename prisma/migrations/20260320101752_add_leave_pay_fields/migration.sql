-- AlterTable
ALTER TABLE "salary_attendance_data" ADD COLUMN     "paid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
ADD COLUMN     "paid_leave_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unpaid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "daily_work_hours" DECIMAL(4,1) NOT NULL DEFAULT 8;
