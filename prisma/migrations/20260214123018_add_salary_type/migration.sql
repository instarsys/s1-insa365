-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('MONTHLY', 'HOURLY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hourly_rate" DECIMAL(15,0),
ADD COLUMN     "salary_type" "SalaryType" NOT NULL DEFAULT 'MONTHLY';
