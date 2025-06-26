-- CreateEnum
CREATE TYPE "PhoneType" AS ENUM ('HOME', 'DAD', 'MOM', 'OTHER');

-- CreateTable
CREATE TABLE "contact_phones" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "phone_type" "PhoneType" NOT NULL,
    "phone_number" VARCHAR(50) NOT NULL,
    "notes" VARCHAR(255),
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_phones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_phones_student_id_idx" ON "contact_phones"("student_id");

-- CreateIndex
CREATE INDEX "contact_phones_order_idx" ON "contact_phones"("order");

-- AddForeignKey
ALTER TABLE "contact_phones" ADD CONSTRAINT "contact_phones_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
