-- Tenant Isolation Migration
-- Adds companyId to AttendanceSegment and enables RLS on all tenant tables

-- ============================================================
-- 1. AttendanceSegment: Add companyId column
-- ============================================================

ALTER TABLE "attendance_segments" ADD COLUMN "company_id" TEXT;

-- Backfill companyId from parent attendance record
UPDATE "attendance_segments" s
SET "company_id" = a."company_id"
FROM "attendances" a
WHERE s."attendance_id" = a."id";

-- Make NOT NULL after backfill
ALTER TABLE "attendance_segments" ALTER COLUMN "company_id" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "attendance_segments"
ADD CONSTRAINT "attendance_segments_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index for RLS performance
CREATE INDEX "attendance_segments_company_id_idx" ON "attendance_segments"("company_id");

-- ============================================================
-- 2. Enable Row-Level Security on 16 tenant tables
-- ============================================================

-- Users
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON "users"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Departments
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_departments ON "departments"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Positions
ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_positions ON "positions"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Work Policies
ALTER TABLE "work_policies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_work_policies ON "work_policies"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Work Locations
ALTER TABLE "work_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_work_locations ON "work_locations"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Salary Rules
ALTER TABLE "salary_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_salary_rules ON "salary_rules"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Employee Salary Items
ALTER TABLE "employee_salary_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_employee_salary_items ON "employee_salary_items"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Attendances
ALTER TABLE "attendances" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_attendances ON "attendances"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Attendance Segments
ALTER TABLE "attendance_segments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_attendance_segments ON "attendance_segments"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Salary Attendance Data
ALTER TABLE "salary_attendance_data" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_salary_attendance_data ON "salary_attendance_data"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Salary Calculations
ALTER TABLE "salary_calculations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_salary_calculations ON "salary_calculations"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Leave Requests
ALTER TABLE "leave_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_leave_requests ON "leave_requests"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Leave Balances
ALTER TABLE "leave_balances" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_leave_balances ON "leave_balances"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Notifications
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notifications ON "notifications"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Payroll Monthlies
ALTER TABLE "payroll_monthlies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payroll_monthlies ON "payroll_monthlies"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- Audit Logs (special: company_id can be NULL for system-level logs)
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_logs ON "audit_logs"
  USING (
    company_id IS NULL
    OR company_id = current_setting('app.company_id', true)::text
  )
  WITH CHECK (
    company_id IS NULL
    OR company_id = current_setting('app.company_id', true)::text
  );

-- ============================================================
-- 3. Bypass RLS for the superuser / migration role
--    The application role should NOT have BYPASSRLS.
--    This ensures Prisma migrations can still run.
-- ============================================================
-- NOTE: Run this manually for your DB superuser if needed:
-- ALTER ROLE postgres BYPASSRLS;
-- The application role (e.g., 'app_user') should NOT have BYPASSRLS.
