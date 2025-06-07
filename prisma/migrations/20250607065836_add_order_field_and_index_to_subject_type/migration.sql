-- AlterTable
ALTER TABLE "subject_types" ADD COLUMN     "order" INTEGER;

-- CreateIndex
CREATE INDEX "subject_types_order_idx" ON "subject_types"("order");
