/*
  Warnings:

  - A unique constraint covering the columns `[name,branch_id]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "subject_types" (
    "subject_type_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_types_pkey" PRIMARY KEY ("subject_type_id")
);

-- CreateTable
CREATE TABLE "subject_offerings" (
    "subject_offering_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "subject_type_id" TEXT NOT NULL,
    "offeringCode" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_offerings_pkey" PRIMARY KEY ("subject_offering_id")
);

-- CreateTable
CREATE TABLE "teacher_qualifications" (
    "qualification_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "subject_offering_id" TEXT NOT NULL,
    "qualification_date" DATE,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" VARCHAR(100),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_qualifications_pkey" PRIMARY KEY ("qualification_id")
);

-- CreateTable
CREATE TABLE "student_subject_preferences" (
    "preference_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_offering_id" TEXT NOT NULL,
    "preference_date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" INTEGER DEFAULT 1,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_subject_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_types_name_key" ON "subject_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subject_offerings_offeringCode_key" ON "subject_offerings"("offeringCode");

-- CreateIndex
CREATE INDEX "subject_offerings_subject_id_idx" ON "subject_offerings"("subject_id");

-- CreateIndex
CREATE INDEX "subject_offerings_subject_type_id_idx" ON "subject_offerings"("subject_type_id");

-- CreateIndex
CREATE INDEX "subject_offerings_is_active_idx" ON "subject_offerings"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "subject_offerings_subject_id_subject_type_id_key" ON "subject_offerings"("subject_id", "subject_type_id");

-- CreateIndex
CREATE INDEX "teacher_qualifications_teacher_id_idx" ON "teacher_qualifications"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_qualifications_subject_offering_id_idx" ON "teacher_qualifications"("subject_offering_id");

-- CreateIndex
CREATE INDEX "teacher_qualifications_verified_idx" ON "teacher_qualifications"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_qualifications_teacher_id_subject_offering_id_key" ON "teacher_qualifications"("teacher_id", "subject_offering_id");

-- CreateIndex
CREATE INDEX "student_subject_preferences_student_id_idx" ON "student_subject_preferences"("student_id");

-- CreateIndex
CREATE INDEX "student_subject_preferences_subject_offering_id_idx" ON "student_subject_preferences"("subject_offering_id");

-- CreateIndex
CREATE INDEX "student_subject_preferences_priority_idx" ON "student_subject_preferences"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "student_subject_preferences_student_id_subject_offering_id_key" ON "student_subject_preferences"("student_id", "subject_offering_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_branch_id_key" ON "subjects"("name", "branch_id");

-- AddForeignKey
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_offerings" ADD CONSTRAINT "subject_offerings_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_qualifications" ADD CONSTRAINT "teacher_qualifications_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_qualifications" ADD CONSTRAINT "teacher_qualifications_subject_offering_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("subject_offering_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_preferences" ADD CONSTRAINT "student_subject_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_subject_preferences" ADD CONSTRAINT "student_subject_preferences_subject_offering_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("subject_offering_id") ON DELETE CASCADE ON UPDATE CASCADE;
