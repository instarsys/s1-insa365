-- Step 1: Add new columns to work_policies (with defaults so existing rows get values)
ALTER TABLE "work_policies" ADD COLUMN "late_grace_minutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "work_policies" ADD COLUMN "early_leave_grace_minutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "work_policies" ADD COLUMN "night_work_start_time" TEXT NOT NULL DEFAULT '22:00';
ALTER TABLE "work_policies" ADD COLUMN "night_work_end_time" TEXT NOT NULL DEFAULT '06:00';
ALTER TABLE "work_policies" ADD COLUMN "overtime_threshold_minutes" INTEGER NOT NULL DEFAULT 480;
ALTER TABLE "work_policies" ADD COLUMN "monthly_work_hours" INTEGER NOT NULL DEFAULT 209;
ALTER TABLE "work_policies" ADD COLUMN "weekly_holiday" TEXT NOT NULL DEFAULT '0';
ALTER TABLE "work_policies" ADD COLUMN "weekly_work_hours" INTEGER NOT NULL DEFAULT 40;
ALTER TABLE "work_policies" ADD COLUMN "weekly_overtime_limit" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "work_policies" ADD COLUMN "monthly_overtime_limit" INTEGER NOT NULL DEFAULT 52;

-- Step 2: Copy existing Company values to their WorkPolicies
UPDATE "work_policies" wp
SET
  late_grace_minutes = c.late_grace_minutes,
  early_leave_grace_minutes = c.early_leave_grace_minutes,
  night_work_start_time = c.night_work_start_time,
  night_work_end_time = c.night_work_end_time,
  overtime_threshold_minutes = c.overtime_threshold_minutes,
  monthly_work_hours = c.monthly_work_hours
FROM "companies" c
WHERE wp.company_id = c.id;

-- Step 3: Drop columns from companies
ALTER TABLE "companies" DROP COLUMN "early_leave_grace_minutes";
ALTER TABLE "companies" DROP COLUMN "late_grace_minutes";
ALTER TABLE "companies" DROP COLUMN "monthly_work_hours";
ALTER TABLE "companies" DROP COLUMN "night_work_end_time";
ALTER TABLE "companies" DROP COLUMN "night_work_start_time";
ALTER TABLE "companies" DROP COLUMN "overtime_threshold_minutes";
