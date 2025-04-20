-- CreateTable
CREATE TABLE "student_preferences" (
    "student_id" TEXT NOT NULL,
    "preferredSubjects" TEXT[],
    "preferredTeachers" TEXT[],
    "preferredWeekdays" TEXT[],
    "preferredHours" TEXT[],
    "additionalNotes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_preferences_pkey" PRIMARY KEY ("student_id")
);

-- AddForeignKey
ALTER TABLE "student_preferences" ADD CONSTRAINT "student_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
