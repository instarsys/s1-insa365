-- AlterTable
ALTER TABLE "salary_rules" ADD COLUMN "is_system_managed" BOOLEAN NOT NULL DEFAULT false;

-- Update existing D01~D06 as system managed
UPDATE "salary_rules"
SET "is_system_managed" = true
WHERE "code" IN ('D01', 'D02', 'D03', 'D04', 'D05', 'D06')
  AND "deleted_at" IS NULL;
