-- AlterTable
ALTER TABLE "class_types" ADD COLUMN     "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "class_types_parent_id_idx" ON "class_types"("parent_id");

-- AddForeignKey
ALTER TABLE "class_types" ADD CONSTRAINT "class_types_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "class_types"("class_type_id") ON DELETE SET NULL ON UPDATE CASCADE;
