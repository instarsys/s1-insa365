-- Tenant Isolation Hardening Migration
-- 1. Add RLS to company_holidays table (누락되어 있었음)
-- 2. FORCE ROW LEVEL SECURITY on all 17 tenant tables (table owner도 RLS 적용)

-- ============================================================
-- 1. CompanyHoliday RLS
-- ============================================================

ALTER TABLE "company_holidays" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_company_holidays ON "company_holidays"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- ============================================================
-- 2. FORCE ROW LEVEL SECURITY — table owner에게도 RLS 적용
--    (owner가 BYPASSRLS 없이도 RLS 우회 가능한 것을 차단)
-- ============================================================

ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "departments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "positions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "work_policies" FORCE ROW LEVEL SECURITY;
ALTER TABLE "work_locations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "salary_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "employee_salary_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "attendances" FORCE ROW LEVEL SECURITY;
ALTER TABLE "attendance_segments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "salary_attendance_data" FORCE ROW LEVEL SECURITY;
ALTER TABLE "salary_calculations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "leave_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE "leave_balances" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payroll_monthlies" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "company_holidays" FORCE ROW LEVEL SECURITY;
