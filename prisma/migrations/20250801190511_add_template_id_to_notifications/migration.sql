-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "template_id" VARCHAR;

-- CreateIndex
CREATE INDEX "notifications_template_id_idx" ON "notifications"("template_id");