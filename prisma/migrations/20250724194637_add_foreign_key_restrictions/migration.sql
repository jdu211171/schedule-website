-- DropForeignKey
ALTER TABLE "UserSubjectPreference" DROP CONSTRAINT "UserSubjectPreference_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "UserSubjectPreference" DROP CONSTRAINT "UserSubjectPreference_subjectTypeId_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_booth_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_class_type_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_student_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "line_message_templates" DROP CONSTRAINT "line_message_templates_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "student_class_enrollments" DROP CONSTRAINT "student_class_enrollments_class_id_fkey";

-- DropForeignKey
ALTER TABLE "student_class_enrollments" DROP CONSTRAINT "student_class_enrollments_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_teacher_preferences" DROP CONSTRAINT "student_teacher_preferences_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_teacher_preferences" DROP CONSTRAINT "student_teacher_preferences_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "student_teacher_preferences" DROP CONSTRAINT "student_teacher_preferences_subject_type_id_fkey";

-- DropForeignKey
ALTER TABLE "student_teacher_preferences" DROP CONSTRAINT "student_teacher_preferences_teacher_id_fkey";

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("booth_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("class_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_sessions"("class_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubjectPreference" ADD CONSTRAINT "UserSubjectPreference_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubjectPreference" ADD CONSTRAINT "UserSubjectPreference_subjectTypeId_fkey" FOREIGN KEY ("subjectTypeId") REFERENCES "subject_types"("subject_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teacher_preferences" ADD CONSTRAINT "student_teacher_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teacher_preferences" ADD CONSTRAINT "student_teacher_preferences_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teacher_preferences" ADD CONSTRAINT "student_teacher_preferences_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teacher_preferences" ADD CONSTRAINT "student_teacher_preferences_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_message_templates" ADD CONSTRAINT "line_message_templates_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;
