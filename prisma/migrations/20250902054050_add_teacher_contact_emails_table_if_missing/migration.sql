/*
  Warnings:

  - Made the column `branch_id` on table `vacations` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "vacations" DROP CONSTRAINT "vacations_branch_id_fkey";

-- AlterTable
ALTER TABLE "vacations" ALTER COLUMN "branch_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "contact_emails" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "notes" VARCHAR(255),
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_contact_emails" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "notes" VARCHAR(255),
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_contact_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_emails_student_id_idx" ON "contact_emails"("student_id");

-- CreateIndex
CREATE INDEX "contact_emails_order_idx" ON "contact_emails"("order");

-- CreateIndex
CREATE INDEX "teacher_contact_emails_teacher_id_idx" ON "teacher_contact_emails"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_contact_emails_order_idx" ON "teacher_contact_emails"("order");

-- AddForeignKey
ALTER TABLE "contact_emails" ADD CONSTRAINT "contact_emails_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_contact_emails" ADD CONSTRAINT "teacher_contact_emails_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacations" ADD CONSTRAINT "vacations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;
