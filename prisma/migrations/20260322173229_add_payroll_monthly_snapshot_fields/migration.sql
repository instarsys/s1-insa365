-- AlterTable
ALTER TABLE "payroll_monthlies" ADD COLUMN     "attendance_snapshot" JSONB,
ADD COLUMN     "deduction_items_snapshot" JSONB,
ADD COLUMN     "department_name" TEXT,
ADD COLUMN     "employee_name" TEXT,
ADD COLUMN     "employee_number" TEXT,
ADD COLUMN     "pay_items_snapshot" JSONB,
ADD COLUMN     "salary_type" TEXT,
ADD COLUMN     "snapshot_metadata" JSONB;
