-- AlterTable
ALTER TABLE "class_types" ADD COLUMN     "order" INTEGER;

-- CreateIndex
CREATE INDEX "class_types_order_idx" ON "class_types"("order");
