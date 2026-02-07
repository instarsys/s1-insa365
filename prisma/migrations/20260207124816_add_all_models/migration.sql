-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "InsuranceMode" AS ENUM ('AUTO', 'MANUAL', 'NONE');

-- CreateEnum
CREATE TYPE "SalaryItemType" AS ENUM ('BASE', 'ALLOWANCE', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('FIXED', 'FORMULA', 'VARIABLE');

-- CreateEnum
CREATE TYPE "PaymentCycle" AS ENUM ('MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SalaryStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PAID', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'READ', 'CONFIRM', 'CANCEL', 'EXPORT', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('ON_TIME', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'HALF_DAY', 'HOLIDAY', 'LEAVE');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'HALF_DAY_AM', 'HALF_DAY_PM', 'SICK', 'FAMILY_EVENT', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYROLL_CONFIRMED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'OVERTIME_WARNING', 'ATTENDANCE_MISSING', 'LEGAL_PARAM_CHANGED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "LegalParameterCategory" AS ENUM ('WORK_HOURS', 'OVERTIME', 'TAX', 'SEVERANCE', 'PENSION');

-- CreateEnum
CREATE TYPE "ProrationMethod" AS ENUM ('CALENDAR_DAY', 'WORKING_DAY');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('TRIAL', 'STARTER', 'PRO');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business_number" TEXT NOT NULL,
    "representative_name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "pay_day" INTEGER NOT NULL DEFAULT 25,
    "monthly_work_hours" INTEGER NOT NULL DEFAULT 209,
    "late_grace_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_grace_minutes" INTEGER NOT NULL DEFAULT 0,
    "night_work_start_time" TEXT NOT NULL DEFAULT '22:00',
    "night_work_end_time" TEXT NOT NULL DEFAULT '06:00',
    "overtime_threshold_minutes" INTEGER NOT NULL DEFAULT 480,
    "proration_method" "ProrationMethod" NOT NULL DEFAULT 'CALENDAR_DAY',
    "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_number" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "employee_status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "department_id" TEXT,
    "position_id" TEXT,
    "work_policy_id" TEXT,
    "work_location_id" TEXT,
    "join_date" TIMESTAMP(3),
    "resign_date" TIMESTAMP(3),
    "dependents" INTEGER NOT NULL DEFAULT 1,
    "encrypted_rrn" TEXT,
    "encrypted_bank_account" TEXT,
    "bank_name" TEXT,
    "can_view_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "national_pension_mode" "InsuranceMode" NOT NULL DEFAULT 'AUTO',
    "health_insurance_mode" "InsuranceMode" NOT NULL DEFAULT 'AUTO',
    "employment_insurance_mode" "InsuranceMode" NOT NULL DEFAULT 'AUTO',
    "manual_national_pension_base" DECIMAL(15,0),
    "manual_health_insurance_base" DECIMAL(15,0),
    "profile_image_url" TEXT,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_policies" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 60,
    "work_days" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_locations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "radius_meters" INTEGER NOT NULL DEFAULT 100,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_rules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SalaryItemType" NOT NULL,
    "payment_type" "PaymentType" NOT NULL DEFAULT 'FIXED',
    "payment_cycle" "PaymentCycle" NOT NULL DEFAULT 'MONTHLY',
    "default_amount" DECIMAL(15,0),
    "is_ordinary_wage" BOOLEAN NOT NULL DEFAULT false,
    "is_tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "tax_exempt_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "formula" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "salary_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_salary_items" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SalaryItemType" NOT NULL,
    "payment_type" "PaymentType" NOT NULL DEFAULT 'FIXED',
    "payment_cycle" "PaymentCycle" NOT NULL DEFAULT 'MONTHLY',
    "amount" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "is_ordinary_wage" BOOLEAN NOT NULL DEFAULT false,
    "is_tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "tax_exempt_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "formula" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "employee_salary_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "check_in_time" TIMESTAMP(3),
    "check_out_time" TIMESTAMP(3),
    "check_in_latitude" DECIMAL(10,7),
    "check_in_longitude" DECIMAL(10,7),
    "check_out_latitude" DECIMAL(10,7),
    "check_out_longitude" DECIMAL(10,7),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ON_TIME',
    "regular_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "night_minutes" INTEGER NOT NULL DEFAULT 0,
    "night_overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "holiday_minutes" INTEGER NOT NULL DEFAULT 0,
    "holiday_overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "holiday_night_minutes" INTEGER NOT NULL DEFAULT 0,
    "holiday_night_overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_holiday" BOOLEAN NOT NULL DEFAULT false,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_segments" (
    "id" TEXT NOT NULL,
    "attendance_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_attendance_data" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "work_days" INTEGER NOT NULL DEFAULT 0,
    "actual_work_days" INTEGER NOT NULL DEFAULT 0,
    "absent_days" INTEGER NOT NULL DEFAULT 0,
    "late_days" INTEGER NOT NULL DEFAULT 0,
    "early_leave_days" INTEGER NOT NULL DEFAULT 0,
    "leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "total_regular_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_night_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_night_overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_holiday_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_holiday_overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_holiday_night_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_holiday_night_overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "confirmed_at" TIMESTAMP(3) NOT NULL,
    "confirmed_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_attendance_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_calculations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "SalaryStatus" NOT NULL DEFAULT 'DRAFT',
    "ordinary_wage_monthly" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "ordinary_wage_hourly" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "base_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "fixed_allowances" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "overtime_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "night_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "night_overtime_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "holiday_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "holiday_overtime_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "holiday_night_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "holiday_night_overtime_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "variable_allowances" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "attendance_deductions" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "total_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "total_non_taxable" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "taxable_income" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "national_pension" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "health_insurance" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "long_term_care" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "employment_insurance" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "income_tax" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "local_income_tax" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "total_deduction" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "pay_items_snapshot" JSONB,
    "deduction_items_snapshot" JSONB,
    "insurance_rates_snapshot" JSONB,
    "proration_applied" BOOLEAN NOT NULL DEFAULT false,
    "proration_ratio" DECIMAL(10,6),
    "minimum_wage_warning" BOOLEAN NOT NULL DEFAULT false,
    "skip_reason" TEXT,
    "error_message" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" TEXT,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "salary_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_rates" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "employee_rate" DECIMAL(10,6) NOT NULL,
    "employer_rate" DECIMAL(10,6) NOT NULL,
    "min_base" DECIMAL(15,0),
    "max_base" DECIMAL(15,0),
    "effective_start_date" DATE NOT NULL,
    "effective_end_date" DATE NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_brackets" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "min_income" DECIMAL(15,0) NOT NULL,
    "max_income" DECIMAL(15,0) NOT NULL,
    "dependents" INTEGER NOT NULL,
    "tax_amount" DECIMAL(15,0) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_exempt_limits" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthly_limit" DECIMAL(15,0) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_exempt_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minimum_wages" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "hourly_wage" DECIMAL(10,0) NOT NULL,
    "monthly_wage" DECIMAL(15,0) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "minimum_wages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_parameters" (
    "id" TEXT NOT NULL,
    "category" "LegalParameterCategory" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_monthlies" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "total_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "taxable_income" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "total_non_taxable" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "national_pension" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "health_insurance" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "long_term_care" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "employment_insurance" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "income_tax" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "local_income_tax" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_monthlies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "days" DECIMAL(5,1) NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "total_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "used_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "remaining_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_company_id_employee_status_idx" ON "users"("company_id", "employee_status");

-- CreateIndex
CREATE UNIQUE INDEX "users_company_id_email_key" ON "users"("company_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_company_id_employee_number_key" ON "users"("company_id", "employee_number");

-- CreateIndex
CREATE INDEX "departments_company_id_idx" ON "departments"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_company_id_name_key" ON "departments"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "positions_company_id_name_key" ON "positions"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "salary_rules_company_id_code_key" ON "salary_rules"("company_id", "code");

-- CreateIndex
CREATE INDEX "employee_salary_items_company_id_user_id_idx" ON "employee_salary_items"("company_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_salary_items_user_id_code_key" ON "employee_salary_items"("user_id", "code");

-- CreateIndex
CREATE INDEX "attendances_company_id_date_idx" ON "attendances"("company_id", "date");

-- CreateIndex
CREATE INDEX "attendances_company_id_user_id_date_idx" ON "attendances"("company_id", "user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_user_id_date_key" ON "attendances"("user_id", "date");

-- CreateIndex
CREATE INDEX "attendance_segments_attendance_id_idx" ON "attendance_segments"("attendance_id");

-- CreateIndex
CREATE INDEX "salary_attendance_data_company_id_year_month_idx" ON "salary_attendance_data"("company_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "salary_attendance_data_company_id_user_id_year_month_versio_key" ON "salary_attendance_data"("company_id", "user_id", "year", "month", "version");

-- CreateIndex
CREATE INDEX "salary_calculations_company_id_year_month_idx" ON "salary_calculations"("company_id", "year", "month");

-- CreateIndex
CREATE INDEX "salary_calculations_company_id_status_idx" ON "salary_calculations"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "salary_calculations_company_id_user_id_year_month_key" ON "salary_calculations"("company_id", "user_id", "year", "month");

-- CreateIndex
CREATE INDEX "insurance_rates_type_effective_start_date_effective_end_dat_idx" ON "insurance_rates"("type", "effective_start_date", "effective_end_date");

-- CreateIndex
CREATE INDEX "tax_brackets_year_dependents_idx" ON "tax_brackets"("year", "dependents");

-- CreateIndex
CREATE UNIQUE INDEX "tax_exempt_limits_year_code_key" ON "tax_exempt_limits"("year", "code");

-- CreateIndex
CREATE UNIQUE INDEX "minimum_wages_year_key" ON "minimum_wages"("year");

-- CreateIndex
CREATE UNIQUE INDEX "legal_parameters_key_key" ON "legal_parameters"("key");

-- CreateIndex
CREATE INDEX "legal_parameters_category_idx" ON "legal_parameters"("category");

-- CreateIndex
CREATE INDEX "payroll_monthlies_company_id_year_month_idx" ON "payroll_monthlies"("company_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_monthlies_company_id_user_id_year_month_key" ON "payroll_monthlies"("company_id", "user_id", "year", "month");

-- CreateIndex
CREATE INDEX "leave_requests_company_id_user_id_idx" ON "leave_requests"("company_id", "user_id");

-- CreateIndex
CREATE INDEX "leave_requests_company_id_status_idx" ON "leave_requests"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_company_id_user_id_year_key" ON "leave_balances"("company_id", "user_id", "year");

-- CreateIndex
CREATE INDEX "notifications_company_id_user_id_is_read_idx" ON "notifications"("company_id", "user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_entity_type_created_at_idx" ON "audit_logs"("company_id", "entity_type", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_work_policy_id_fkey" FOREIGN KEY ("work_policy_id") REFERENCES "work_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "work_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_policies" ADD CONSTRAINT "work_policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_locations" ADD CONSTRAINT "work_locations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_rules" ADD CONSTRAINT "salary_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_items" ADD CONSTRAINT "employee_salary_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_items" ADD CONSTRAINT "employee_salary_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_segments" ADD CONSTRAINT "attendance_segments_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_attendance_data" ADD CONSTRAINT "salary_attendance_data_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_calculations" ADD CONSTRAINT "salary_calculations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_calculations" ADD CONSTRAINT "salary_calculations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_monthlies" ADD CONSTRAINT "payroll_monthlies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_monthlies" ADD CONSTRAINT "payroll_monthlies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
