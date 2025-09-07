-- Relax database-level enum constraints for students
-- Convert enum columns on students to VARCHAR to make imports tolerant

-- status: UserStatus -> VARCHAR(50) with same default 'ACTIVE'
ALTER TABLE "students"
  ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "students"
  ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;
ALTER TABLE "students"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- exam_category: ExamCategory -> VARCHAR(50)
ALTER TABLE "students"
  ALTER COLUMN "exam_category" TYPE VARCHAR(50) USING "exam_category"::text;

-- exam_category_type: ExamCategoryType -> VARCHAR(50)
ALTER TABLE "students"
  ALTER COLUMN "exam_category_type" TYPE VARCHAR(50) USING "exam_category_type"::text;

-- school_type: SchoolType -> VARCHAR(50)
ALTER TABLE "students"
  ALTER COLUMN "school_type" TYPE VARCHAR(50) USING "school_type"::text;

-- Note: We intentionally do NOT drop the underlying enum types to avoid
-- impacting other tables or historic migrations. They will be unused.

