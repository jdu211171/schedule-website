-- AlterTable
ALTER TABLE "users" ADD COLUMN     "order" INTEGER;

-- CreateIndex
CREATE INDEX "users_order_idx" ON "users"("order");
