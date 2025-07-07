-- CreateTable
CREATE TABLE "archives" (
    "archive_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "teacher_name" VARCHAR(100),
    "student_name" VARCHAR(100),
    "subject_name" VARCHAR(100),
    "booth_name" VARCHAR(100),
    "date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "duration" INTEGER,
    "notes" VARCHAR(255),
    "archived_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archives_pkey" PRIMARY KEY ("archive_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "archives_class_id_key" ON "archives"("class_id");
