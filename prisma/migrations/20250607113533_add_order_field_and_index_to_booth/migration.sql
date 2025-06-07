-- AlterTable
ALTER TABLE "booths" ADD COLUMN     "order" INTEGER;

-- CreateIndex
CREATE INDEX "booths_order_idx" ON "booths"("order");
