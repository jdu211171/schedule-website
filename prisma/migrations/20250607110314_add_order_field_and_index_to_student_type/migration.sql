-- AlterTable
ALTER TABLE "student_types" ADD COLUMN     "order" INTEGER;

-- CreateIndex
CREATE INDEX "student_types_order_idx" ON "student_types"("order");
