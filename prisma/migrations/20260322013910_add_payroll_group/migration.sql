-- AlterTable
ALTER TABLE "users" ADD COLUMN     "payroll_group_id" TEXT;

-- CreateTable
CREATE TABLE "payroll_groups" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "pay_day" INTEGER NOT NULL DEFAULT 25,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payroll_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_group_managers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "payroll_group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_group_managers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_groups_company_id_idx" ON "payroll_groups"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_groups_company_id_name_key" ON "payroll_groups"("company_id", "name");

-- CreateIndex
CREATE INDEX "payroll_group_managers_company_id_idx" ON "payroll_group_managers"("company_id");

-- CreateIndex
CREATE INDEX "payroll_group_managers_user_id_idx" ON "payroll_group_managers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_group_managers_payroll_group_id_user_id_key" ON "payroll_group_managers"("payroll_group_id", "user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_payroll_group_id_fkey" FOREIGN KEY ("payroll_group_id") REFERENCES "payroll_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_groups" ADD CONSTRAINT "payroll_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_group_managers" ADD CONSTRAINT "payroll_group_managers_payroll_group_id_fkey" FOREIGN KEY ("payroll_group_id") REFERENCES "payroll_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_group_managers" ADD CONSTRAINT "payroll_group_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
