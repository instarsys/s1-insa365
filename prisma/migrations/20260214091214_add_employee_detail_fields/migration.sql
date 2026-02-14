-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "hire_type" TEXT,
ADD COLUMN     "is_householder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resign_reason" TEXT;
