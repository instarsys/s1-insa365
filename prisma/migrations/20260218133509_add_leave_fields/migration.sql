-- AlterTable
ALTER TABLE "users" ADD COLUMN     "leave_end_date" TIMESTAMP(3),
ADD COLUMN     "leave_reason" TEXT,
ADD COLUMN     "leave_start_date" TIMESTAMP(3);
