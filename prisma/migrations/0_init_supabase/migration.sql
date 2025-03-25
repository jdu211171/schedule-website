-- CreateTable
CREATE TABLE "booths" (
    "booth_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "booths_pkey" PRIMARY KEY ("booth_id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "class_id" VARCHAR(50) NOT NULL,
    "date" DATE,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "duration" VARCHAR(20),
    "teacher_id" VARCHAR(50),
    "subject_id" VARCHAR(50),
    "booth_id" VARCHAR(50),
    "class_type_id" VARCHAR(50),
    "is_group_class" BOOLEAN DEFAULT false,
    "max_students" INTEGER DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("class_id")
);

-- CreateTable
CREATE TABLE "class_types" (
    "class_type_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "class_types_pkey" PRIMARY KEY ("class_type_id")
);

-- CreateTable
CREATE TABLE "course_assignments" (
    "teacher_id" VARCHAR(50) NOT NULL,
    "course_id" VARCHAR(50) NOT NULL,
    "assignment_date" DATE,
    "status" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("teacher_id","course_id")
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "student_id" VARCHAR(50) NOT NULL,
    "course_id" VARCHAR(50) NOT NULL,
    "enrollment_date" DATE,
    "status" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("student_id","course_id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "evaluation_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "score" INTEGER,
    "notes" TEXT,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("evaluation_id")
);

-- CreateTable
CREATE TABLE "grades" (
    "grade_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "grade_type" VARCHAR(50),
    "grade_number" VARCHAR(20),
    "notes" TEXT,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("grade_id")
);

-- CreateTable
CREATE TABLE "intensive_courses" (
    "course_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "subject_id" VARCHAR(50),
    "grade_id" VARCHAR(50),
    "class_duration" VARCHAR(20),
    "class_sessions" VARCHAR(20),
    "session_type" VARCHAR(50),

    CONSTRAINT "intensive_courses_pkey" PRIMARY KEY ("course_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" VARCHAR(50) NOT NULL,
    "recipient_type" VARCHAR(20),
    "recipient_id" VARCHAR(50),
    "notification_type" VARCHAR(50),
    "message" TEXT,
    "related_class_id" VARCHAR(50),
    "sent_via" VARCHAR(20),
    "sent_at" TIMESTAMP(6),
    "read_at" TIMESTAMP(6),
    "status" VARCHAR(20),
    "notes" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "regular_class_templates" (
    "template_id" VARCHAR(50) NOT NULL,
    "day_of_week" VARCHAR(20),
    "subject_id" VARCHAR(50),
    "booth_id" VARCHAR(50),
    "teacher_id" VARCHAR(50),
    "start_time" TIME(6),
    "end_time" TIME(6),
    "notes" TEXT,

    CONSTRAINT "regular_class_templates_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "student_class_enrollments" (
    "enrollment_id" VARCHAR(50) NOT NULL,
    "class_id" VARCHAR(50),
    "student_id" VARCHAR(50),
    "status" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "student_class_enrollments_pkey" PRIMARY KEY ("enrollment_id")
);

-- CreateTable
CREATE TABLE "student_regular_preferences" (
    "preference_id" VARCHAR(50) NOT NULL,
    "student_id" VARCHAR(50),
    "subject_id" VARCHAR(50),
    "day_of_week" VARCHAR(20),
    "start_time" TIME(6),
    "end_time" TIME(6),
    "notes" TEXT,

    CONSTRAINT "student_regular_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "student_special_preferences" (
    "preference_id" VARCHAR(50) NOT NULL,
    "student_id" VARCHAR(50),
    "class_type_id" VARCHAR(50),
    "subject_id" VARCHAR(50),
    "date" DATE,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "notes" TEXT,

    CONSTRAINT "student_special_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "student_subjects" (
    "student_id" VARCHAR(50) NOT NULL,
    "subject_id" VARCHAR(50) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "student_subjects_pkey" PRIMARY KEY ("student_id","subject_id")
);

-- CreateTable
CREATE TABLE "student_types" (
    "student_type_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "student_types_pkey" PRIMARY KEY ("student_type_id")
);

-- CreateTable
CREATE TABLE "students" (
    "student_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "kana_name" VARCHAR(100),
    "grade_id" VARCHAR(50),
    "school_name" VARCHAR(100),
    "school_type" VARCHAR(20),
    "exam_category" VARCHAR(50),
    "first_choice_school" VARCHAR(100),
    "second_choice_school" VARCHAR(100),
    "enrollment_date" DATE,
    "birth_date" DATE,
    "home_phone" VARCHAR(20),
    "parent_mobile" VARCHAR(20),
    "student_mobile" VARCHAR(20),
    "parent_email" VARCHAR(100),
    "notes" TEXT,

    CONSTRAINT "students_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "subject_types" (
    "subject_type_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "subject_types_pkey" PRIMARY KEY ("subject_type_id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "subject_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "subject_type_id" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "teacher_regular_shifts" (
    "shift_id" VARCHAR(50) NOT NULL,
    "teacher_id" VARCHAR(50),
    "day_of_week" VARCHAR(20),
    "start_time" TIME(6),
    "end_time" TIME(6),
    "notes" TEXT,

    CONSTRAINT "teacher_regular_shifts_pkey" PRIMARY KEY ("shift_id")
);

-- CreateTable
CREATE TABLE "teacher_special_shifts" (
    "shift_id" VARCHAR(50) NOT NULL,
    "teacher_id" VARCHAR(50),
    "date" DATE,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "notes" TEXT,

    CONSTRAINT "teacher_special_shifts_pkey" PRIMARY KEY ("shift_id")
);

-- CreateTable
CREATE TABLE "teacher_subjects" (
    "teacher_id" VARCHAR(50) NOT NULL,
    "subject_id" VARCHAR(50) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("teacher_id","subject_id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "teacher_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "evaluation_id" VARCHAR(50),
    "birth_date" DATE,
    "mobile_number" VARCHAR(20),
    "email" VARCHAR(100),
    "high_school" VARCHAR(100),
    "university" VARCHAR(100),
    "faculty" VARCHAR(100),
    "department" VARCHAR(100),
    "enrollment_status" VARCHAR(50),
    "other_universities" TEXT,
    "english_proficiency" VARCHAR(50),
    "toeic" INTEGER,
    "toefl" INTEGER,
    "math_certification" VARCHAR(50),
    "kanji_certification" VARCHAR(50),
    "other_certifications" TEXT,
    "notes" TEXT,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("teacher_id")
);

-- CreateTable
CREATE TABLE "template_student_assignments" (
    "assignment_id" VARCHAR(50) NOT NULL,
    "template_id" VARCHAR(50),
    "student_id" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "template_student_assignments_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "time_slots" (
    "time_slot_id" VARCHAR(50) NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("time_slot_id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "permission_id" VARCHAR(50) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" VARCHAR(50) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "related_id" VARCHAR(50),
    "is_active" BOOLEAN DEFAULT true,
    "last_login" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_role_resource_action_key" ON "user_permissions"("role", "resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("booth_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("class_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "intensive_courses"("course_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "intensive_courses"("course_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "intensive_courses" ADD CONSTRAINT "intensive_courses_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("grade_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "intensive_courses" ADD CONSTRAINT "intensive_courses_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("booth_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "regular_class_templates" ADD CONSTRAINT "regular_class_templates_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_sessions"("class_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_regular_preferences" ADD CONSTRAINT "student_regular_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_regular_preferences" ADD CONSTRAINT "student_regular_preferences_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_special_preferences" ADD CONSTRAINT "student_special_preferences_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_types"("class_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_special_preferences" ADD CONSTRAINT "student_special_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_special_preferences" ADD CONSTRAINT "student_special_preferences_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_subjects" ADD CONSTRAINT "student_subjects_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_subjects" ADD CONSTRAINT "student_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("grade_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_subject_type_id_fkey" FOREIGN KEY ("subject_type_id") REFERENCES "subject_types"("subject_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_regular_shifts" ADD CONSTRAINT "teacher_regular_shifts_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_special_shifts" ADD CONSTRAINT "teacher_special_shifts_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("evaluation_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "template_student_assignments" ADD CONSTRAINT "template_student_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "template_student_assignments" ADD CONSTRAINT "template_student_assignments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "regular_class_templates"("template_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

