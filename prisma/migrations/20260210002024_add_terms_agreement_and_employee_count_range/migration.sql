-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "employee_count_range" TEXT;

-- CreateTable
CREATE TABLE "terms_agreements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "terms_version" TEXT NOT NULL DEFAULT '1.0',
    "terms_agreed" BOOLEAN NOT NULL,
    "privacy_agreed" BOOLEAN NOT NULL,
    "marketing_agreed" BOOLEAN NOT NULL DEFAULT false,
    "agreed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "terms_agreements_company_id_idx" ON "terms_agreements"("company_id");

-- CreateIndex
CREATE INDEX "terms_agreements_user_id_idx" ON "terms_agreements"("user_id");

-- AddForeignKey
ALTER TABLE "terms_agreements" ADD CONSTRAINT "terms_agreements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_agreements" ADD CONSTRAINT "terms_agreements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
