-- AlterTable
ALTER TABLE "grades" ADD COLUMN     "grade_type_name" VARCHAR(100);

-- AlterTable
ALTER TABLE "intensive_courses" ADD COLUMN     "session_category" VARCHAR(50);

-- AlterTable
ALTER TABLE "regular_class_templates" ADD COLUMN     "duration" TIME(6),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "student_regular_preferences" ADD COLUMN     "preference_priority" INTEGER;

-- AlterTable
ALTER TABLE "student_special_preferences" ADD COLUMN     "preference_priority" INTEGER;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "applied_middle_schools" VARCHAR(255),
ADD COLUMN     "common_test_score" INTEGER,
ADD COLUMN     "exam_subjects" VARCHAR(255),
ADD COLUMN     "kana_name" VARCHAR(100),
ADD COLUMN     "middle_school_exam_exp" BOOLEAN;

-- CreateTable
CREATE TABLE "student_subject_enrollments" (
    "enrollment_id" TEXT NOT NULL,
    "student_id" VARCHAR(50) NOT NULL,
    "subject_id" VARCHAR(50),
    "start_date" DATE,
    "end_date" DATE,
    "status" VARCHAR(20),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_subject_enrollments_pkey" PRIMARY KEY ("enrollment_id")
);

-- CreateTable
CREATE TABLE "schedule_conflicts" (
    "conflict_id" TEXT NOT NULL,
    "entity_type_1" VARCHAR(50) NOT NULL,
    "entity_id_1" VARCHAR(50) NOT NULL,
    "entity_type_2" VARCHAR(50) NOT NULL,
    "entity_id_2" VARCHAR(50) NOT NULL,
    "conflict_date" DATE,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "status" VARCHAR(50) NOT NULL,
    "resolution_strategy" VARCHAR(50),
    "resolved_by" VARCHAR(50),
    "resolution_notes" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_conflicts_pkey" PRIMARY KEY ("conflict_id")
);

-- CreateTable
CREATE TABLE "schedule_views" (
    "id" TEXT NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "source_id" VARCHAR(50) NOT NULL,
    "date" DATE NOT NULL,
    "day_of_week" VARCHAR(20),
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "teacher_id" VARCHAR(50),
    "student_ids" TEXT[],
    "subject_id" VARCHAR(50),
    "booth_id" VARCHAR(50),

    CONSTRAINT "schedule_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_conflicts_entity_type_1_entity_id_1_idx" ON "schedule_conflicts"("entity_type_1", "entity_id_1");

-- CreateIndex
CREATE INDEX "schedule_conflicts_entity_type_2_entity_id_2_idx" ON "schedule_conflicts"("entity_type_2", "entity_id_2");

-- CreateIndex
CREATE INDEX "schedule_conflicts_conflict_date_idx" ON "schedule_conflicts"("conflict_date");

-- CreateIndex
CREATE INDEX "schedule_conflicts_status_idx" ON "schedule_conflicts"("status");

-- CreateIndex
CREATE INDEX "schedule_views_date_idx" ON "schedule_views"("date");

-- CreateIndex
CREATE INDEX "schedule_views_teacher_id_idx" ON "schedule_views"("teacher_id");

-- CreateIndex
CREATE INDEX "schedule_views_entity_type_source_id_idx" ON "schedule_views"("entity_type", "source_id");

-- AddForeignKey
ALTER TABLE "student_subject_enrollments" ADD CONSTRAINT "student_subject_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_enrollments" ADD CONSTRAINT "student_subject_enrollments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;
