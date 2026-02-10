-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InviteSendMethod" AS ENUM ('NONE', 'IMMEDIATE', 'SCHEDULED');

-- CreateTable
CREATE TABLE "employee_invitations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT,
    "invite_code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "department_id" TEXT,
    "position_id" TEXT,
    "send_method" "InviteSendMethod" NOT NULL DEFAULT 'NONE',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_invitations_invite_code_key" ON "employee_invitations"("invite_code");

-- CreateIndex
CREATE INDEX "employee_invitations_company_id_idx" ON "employee_invitations"("company_id");

-- CreateIndex
CREATE INDEX "employee_invitations_company_id_status_idx" ON "employee_invitations"("company_id", "status");

-- AddForeignKey
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
