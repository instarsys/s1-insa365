-- Leave Management System Migration
-- Adds LeaveGroup, LeaveTypeConfig, LeaveAccrualRule, LeaveAccrualRuleTier, LeaveAccrualRecord
-- Adds leaveTypeConfigId FK to LeaveRequest
-- Enables RLS on 4 new tenant tables

-- ============================================================
-- 1. New Enums
-- ============================================================

CREATE TYPE "LeaveTimeOption" AS ENUM ('FULL_DAY', 'HALF_DAY', 'HOURS');
CREATE TYPE "LeaveAccrualBasis" AS ENUM ('JOIN_DATE', 'FISCAL_YEAR');
CREATE TYPE "LeaveAccrualUnit" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "LeaveAccrualSource" AS ENUM ('RULE', 'MANUAL', 'CARRY_OVER');

-- ============================================================
-- 2. LeaveGroup table
-- ============================================================

CREATE TABLE "leave_groups" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allow_overuse" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leave_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leave_groups_company_id_name_key" ON "leave_groups"("company_id", "name");
CREATE INDEX "leave_groups_company_id_idx" ON "leave_groups"("company_id");

ALTER TABLE "leave_groups"
ADD CONSTRAINT "leave_groups_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 3. LeaveTypeConfig table
-- ============================================================

CREATE TABLE "leave_type_configs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "leave_group_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "time_option" "LeaveTimeOption" NOT NULL DEFAULT 'FULL_DAY',
    "paid_hours" DECIMAL(4,1) NOT NULL DEFAULT 8,
    "deduction_days" DECIMAL(4,1) NOT NULL DEFAULT 1,
    "deducts_from_balance" BOOLEAN NOT NULL DEFAULT true,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "max_consecutive_days" INTEGER,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leave_type_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leave_type_configs_company_id_code_key" ON "leave_type_configs"("company_id", "code");
CREATE INDEX "leave_type_configs_company_id_idx" ON "leave_type_configs"("company_id");

ALTER TABLE "leave_type_configs"
ADD CONSTRAINT "leave_type_configs_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_type_configs"
ADD CONSTRAINT "leave_type_configs_leave_group_id_fkey"
FOREIGN KEY ("leave_group_id") REFERENCES "leave_groups"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 4. LeaveAccrualRule table
-- ============================================================

CREATE TABLE "leave_accrual_rules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "leave_group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accrual_basis" "LeaveAccrualBasis" NOT NULL,
    "accrual_unit" "LeaveAccrualUnit" NOT NULL,
    "pro_rata_first_year" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leave_accrual_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leave_accrual_rules_company_id_name_key" ON "leave_accrual_rules"("company_id", "name");
CREATE INDEX "leave_accrual_rules_company_id_idx" ON "leave_accrual_rules"("company_id");

ALTER TABLE "leave_accrual_rules"
ADD CONSTRAINT "leave_accrual_rules_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_accrual_rules"
ADD CONSTRAINT "leave_accrual_rules_leave_group_id_fkey"
FOREIGN KEY ("leave_group_id") REFERENCES "leave_groups"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 5. LeaveAccrualRuleTier table
-- ============================================================

CREATE TABLE "leave_accrual_rule_tiers" (
    "id" TEXT NOT NULL,
    "accrual_rule_id" TEXT NOT NULL,
    "service_month_from" INTEGER NOT NULL,
    "service_month_to" INTEGER NOT NULL,
    "accrual_days" DECIMAL(5,1) NOT NULL,
    "valid_months" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "leave_accrual_rule_tiers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leave_accrual_rule_tiers_accrual_rule_id_idx" ON "leave_accrual_rule_tiers"("accrual_rule_id");

ALTER TABLE "leave_accrual_rule_tiers"
ADD CONSTRAINT "leave_accrual_rule_tiers_accrual_rule_id_fkey"
FOREIGN KEY ("accrual_rule_id") REFERENCES "leave_accrual_rules"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 6. LeaveAccrualRecord table
-- ============================================================

CREATE TABLE "leave_accrual_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "leave_type_config_id" TEXT NOT NULL,
    "accrual_rule_id" TEXT,
    "year" INTEGER NOT NULL,
    "accrual_days" DECIMAL(5,1) NOT NULL,
    "used_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "expired_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "expires_at" DATE,
    "source" "LeaveAccrualSource" NOT NULL DEFAULT 'RULE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_accrual_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leave_accrual_records_company_id_user_id_year_idx" ON "leave_accrual_records"("company_id", "user_id", "year");
CREATE INDEX "leave_accrual_records_company_id_idx" ON "leave_accrual_records"("company_id");

ALTER TABLE "leave_accrual_records"
ADD CONSTRAINT "leave_accrual_records_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_accrual_records"
ADD CONSTRAINT "leave_accrual_records_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_accrual_records"
ADD CONSTRAINT "leave_accrual_records_leave_type_config_id_fkey"
FOREIGN KEY ("leave_type_config_id") REFERENCES "leave_type_configs"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_accrual_records"
ADD CONSTRAINT "leave_accrual_records_accrual_rule_id_fkey"
FOREIGN KEY ("accrual_rule_id") REFERENCES "leave_accrual_rules"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 7. LeaveRequest: Add leaveTypeConfigId FK
-- ============================================================

ALTER TABLE "leave_requests" ADD COLUMN "leave_type_config_id" TEXT;

ALTER TABLE "leave_requests"
ADD CONSTRAINT "leave_requests_leave_type_config_id_fkey"
FOREIGN KEY ("leave_type_config_id") REFERENCES "leave_type_configs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 8. RLS on 4 new tenant tables
-- ============================================================

-- LeaveGroups
ALTER TABLE "leave_groups" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_leave_groups ON "leave_groups"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- LeaveTypeConfigs
ALTER TABLE "leave_type_configs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_leave_type_configs ON "leave_type_configs"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- LeaveAccrualRules
ALTER TABLE "leave_accrual_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_leave_accrual_rules ON "leave_accrual_rules"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);

-- LeaveAccrualRecords
ALTER TABLE "leave_accrual_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_leave_accrual_records ON "leave_accrual_records"
  USING (company_id = current_setting('app.company_id', true)::text)
  WITH CHECK (company_id = current_setting('app.company_id', true)::text);
