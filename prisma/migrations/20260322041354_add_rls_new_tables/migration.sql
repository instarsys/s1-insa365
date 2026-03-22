-- RLS for payroll_groups, payroll_group_managers, role_permissions
-- These policies may already exist if applied manually; use DO blocks for idempotency

-- payroll_groups
ALTER TABLE "payroll_groups" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_groups' AND policyname = 'tenant_isolation_payroll_groups') THEN
    CREATE POLICY tenant_isolation_payroll_groups ON "payroll_groups"
      USING (company_id = current_setting('app.company_id', true)::text)
      WITH CHECK (company_id = current_setting('app.company_id', true)::text);
  END IF;
END $$;
ALTER TABLE "payroll_groups" FORCE ROW LEVEL SECURITY;

-- payroll_group_managers
ALTER TABLE "payroll_group_managers" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_group_managers' AND policyname = 'tenant_isolation_payroll_group_managers') THEN
    CREATE POLICY tenant_isolation_payroll_group_managers ON "payroll_group_managers"
      USING (company_id = current_setting('app.company_id', true)::text)
      WITH CHECK (company_id = current_setting('app.company_id', true)::text);
  END IF;
END $$;
ALTER TABLE "payroll_group_managers" FORCE ROW LEVEL SECURITY;

-- role_permissions
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND policyname = 'tenant_isolation_role_permissions') THEN
    CREATE POLICY tenant_isolation_role_permissions ON "role_permissions"
      USING (company_id = current_setting('app.company_id', true)::text)
      WITH CHECK (company_id = current_setting('app.company_id', true)::text);
  END IF;
END $$;
ALTER TABLE "role_permissions" FORCE ROW LEVEL SECURITY;
