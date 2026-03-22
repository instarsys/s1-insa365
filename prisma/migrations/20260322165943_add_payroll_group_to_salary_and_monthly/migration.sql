-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "seal_url" TEXT;

-- AlterTable
ALTER TABLE "employee_salary_items" ADD COLUMN     "payment_months" TEXT;

-- AlterTable
ALTER TABLE "payroll_monthlies" ADD COLUMN     "payroll_group_id" TEXT;

-- AlterTable
ALTER TABLE "salary_calculations" ADD COLUMN     "payroll_group_id" TEXT;

-- AlterTable
ALTER TABLE "salary_rules" ADD COLUMN     "payment_months" TEXT;

-- CreateIndex
CREATE INDEX "payroll_monthlies_company_id_payroll_group_id_year_month_idx" ON "payroll_monthlies"("company_id", "payroll_group_id", "year", "month");

-- CreateIndex
CREATE INDEX "salary_calculations_company_id_payroll_group_id_year_month_idx" ON "salary_calculations"("company_id", "payroll_group_id", "year", "month");

-- AddForeignKey
ALTER TABLE "salary_calculations" ADD CONSTRAINT "salary_calculations_payroll_group_id_fkey" FOREIGN KEY ("payroll_group_id") REFERENCES "payroll_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_monthlies" ADD CONSTRAINT "payroll_monthlies_payroll_group_id_fkey" FOREIGN KEY ("payroll_group_id") REFERENCES "payroll_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
