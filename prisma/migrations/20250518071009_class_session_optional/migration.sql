-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_booth_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_class_type_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_student_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_teacher_id_fkey";

-- AlterTable
ALTER TABLE "class_sessions" ALTER COLUMN "teacher_id" DROP NOT NULL,
ALTER COLUMN "subject_id" DROP NOT NULL,
ALTER COLUMN "booth_id" DROP NOT NULL,
ALTER COLUMN "class_type_id" DROP NOT NULL,
ALTER COLUMN "student_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("booth_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("class_type_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE SET NULL ON UPDATE CASCADE;
