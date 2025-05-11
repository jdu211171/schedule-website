/*
  Warnings:

  - The primary key for the `teacher_subjects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[student_preference_id,subject_id,subject_type_id]` on the table `student_preference_subjects` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subject_type_id` to the `class_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_type_id` to the `regular_class_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_type_id` to the `student_preference_subjects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_type_id` to the `teacher_subjects` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "student_preference_subjects_student_preference_id_subject_i_key";

-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "subject_type_id" VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE "regular_class_templates" ADD COLUMN     "subject_type_id" VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE "student_preference_subjects" ADD COLUMN     "subject_type_id" VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE "teacher_subjects" DROP CONSTRAINT "teacher_subjects_pkey",
ADD COLUMN     "subject_type_id" VARCHAR(50) NOT NULL,
ADD CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("teacher_id", "subject_id", "subject_type_id");

-- CreateTable
CREATE TABLE "subject_to_subject_types" (
    "subject_id" VARCHAR(50) NOT NULL,
    "subject_type_id" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_to_subject_types_pkey" PRIMARY KEY ("subject_id","subject_type_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_preference_subjects_student_preference_id_subject_i_key" ON "student_preference_subjects"("student_preference_id", "subject_id", "subject_type_id");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_preference_subjects" ADD CONSTRAINT "student_preference_subjects_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_to_subject_types" ADD CONSTRAINT "subject_to_subject_types_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_to_subject_types" ADD CONSTRAINT "subject_to_subject_types_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE CASCADE ON UPDATE CASCADE;
