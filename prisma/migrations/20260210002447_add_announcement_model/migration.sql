-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('NEWS', 'NEW_FEATURE', 'NOTICE', 'UPDATE');

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "category" "AnnouncementCategory" NOT NULL DEFAULT 'NOTICE',
    "title" TEXT NOT NULL,
    "content" TEXT,
    "is_new" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_company_id_idx" ON "announcements"("company_id");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
