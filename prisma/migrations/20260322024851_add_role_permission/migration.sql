-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "category" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_permissions_company_id_role_idx" ON "role_permissions"("company_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_company_id_role_category_permission_key" ON "role_permissions"("company_id", "role", "category", "permission");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
