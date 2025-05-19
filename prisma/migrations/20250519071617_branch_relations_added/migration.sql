-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "class_types" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "branch_id" TEXT;

-- CreateIndex
CREATE INDEX "class_sessions_branch_id_idx" ON "class_sessions"("branch_id");

-- CreateIndex
CREATE INDEX "class_types_branch_id_idx" ON "class_types"("branch_id");

-- CreateIndex
CREATE INDEX "events_branch_id_idx" ON "events"("branch_id");

-- CreateIndex
CREATE INDEX "notifications_branch_id_idx" ON "notifications"("branch_id");

-- CreateIndex
CREATE INDEX "subjects_branch_id_idx" ON "subjects"("branch_id");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_types" ADD CONSTRAINT "class_types_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;
