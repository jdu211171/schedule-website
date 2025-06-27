-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "phone_notes" VARCHAR(255),
ADD COLUMN     "phone_number" VARCHAR(50);

-- CreateTable
CREATE TABLE "teacher_contact_phones" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "phone_type" "PhoneType" NOT NULL,
    "phone_number" VARCHAR(50) NOT NULL,
    "notes" VARCHAR(255),
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_contact_phones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_contact_phones_teacher_id_idx" ON "teacher_contact_phones"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_contact_phones_order_idx" ON "teacher_contact_phones"("order");

-- AddForeignKey
ALTER TABLE "teacher_contact_phones" ADD CONSTRAINT "teacher_contact_phones_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;
