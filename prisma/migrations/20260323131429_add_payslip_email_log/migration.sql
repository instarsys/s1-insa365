-- CreateEnum
CREATE TYPE "PayslipEmailStatus" AS ENUM ('PENDING', 'SENT', 'OPENED', 'FAILED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SEND';

-- CreateTable
CREATE TABLE "payslip_email_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payroll_monthly_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "status" "PayslipEmailStatus" NOT NULL DEFAULT 'PENDING',
    "tracking_token" TEXT NOT NULL,
    "resend_message_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "fail_reason" TEXT,
    "sent_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslip_email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payslip_email_logs_tracking_token_key" ON "payslip_email_logs"("tracking_token");

-- CreateIndex
CREATE INDEX "payslip_email_logs_company_id_year_month_idx" ON "payslip_email_logs"("company_id", "year", "month");

-- CreateIndex
CREATE INDEX "payslip_email_logs_company_id_user_id_year_month_idx" ON "payslip_email_logs"("company_id", "user_id", "year", "month");

-- AddForeignKey
ALTER TABLE "payslip_email_logs" ADD CONSTRAINT "payslip_email_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_email_logs" ADD CONSTRAINT "payslip_email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_email_logs" ADD CONSTRAINT "payslip_email_logs_payroll_monthly_id_fkey" FOREIGN KEY ("payroll_monthly_id") REFERENCES "payroll_monthlies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
