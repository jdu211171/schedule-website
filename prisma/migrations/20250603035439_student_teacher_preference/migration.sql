-- CreateTable
CREATE TABLE "student_teacher_preferences" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "subject_type_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_teacher_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_teacher_preferences_student_id_idx" ON "student_teacher_preferences"("student_id");

-- CreateIndex
CREATE INDEX "student_teacher_preferences_teacher_id_idx" ON "student_teacher_preferences"("teacher_id");

-- CreateIndex
CREATE INDEX "student_teacher_preferences_subject_id_idx" ON "student_teacher_preferences"("subject_id");

-- CreateIndex
CREATE INDEX "student_teacher_preferences_subject_type_id_idx" ON "student_teacher_preferences"("subject_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_teacher_preferences_student_id_teacher_id_subject_i_key" ON "student_teacher_preferences"("student_id", "teacher_id", "subject_id", "subject_type_id");

-- AddForeignKey
ALTER TABLE "student_teacher_preferences" ADD CONSTRAINT "student_teacher_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teacher_preferences" ADD CONSTRAINT "student_teacher_preferences_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teacher_preferences" ADD CONSTRAINT "student_teacher_preferences_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teacher_preferences" ADD CONSTRAINT "student_teacher_preferences_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE CASCADE ON UPDATE CASCADE;
