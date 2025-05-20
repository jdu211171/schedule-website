-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "series_id" TEXT;

-- CreateIndex
CREATE INDEX "class_sessions_series_id_idx" ON "class_sessions"("series_id");
