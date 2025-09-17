-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "status" VARCHAR(20);

-- CreateTable
CREATE TABLE "class_series" (
    "series_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "teacher_id" TEXT,
    "student_id" TEXT,
    "subject_id" TEXT,
    "class_type_id" TEXT,
    "booth_id" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "duration" INTEGER,
    "days_of_week" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "generation_mode" TEXT NOT NULL DEFAULT 'ON_DEMAND',
    "last_generated_through" DATE,
    "conflict_policy" JSONB,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_series_pkey" PRIMARY KEY ("series_id")
);

-- CreateIndex
CREATE INDEX "class_series_student_id_idx" ON "class_series"("student_id");

-- CreateIndex
CREATE INDEX "class_series_teacher_id_idx" ON "class_series"("teacher_id");

-- CreateIndex
CREATE INDEX "class_series_branch_id_idx" ON "class_series"("branch_id");

-- CreateIndex
CREATE INDEX "class_series_class_type_id_idx" ON "class_series"("class_type_id");

-- CreateIndex
CREATE INDEX "class_series_status_idx" ON "class_series"("status");
