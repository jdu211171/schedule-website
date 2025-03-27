import { z } from 'zod';

// Common field schemas
const idField = z.string().min(1).max(50);
const nameField = z.string().min(1).max(100);
const notesField = z.string().optional().nullable();
const dateField = z.coerce.date().optional().nullable();
const timeField = z.coerce.date().optional().nullable();

// Grades
export const gradeSchema = z.object({
    grade_id: idField,
    name: nameField,
    grade_type: z.string().max(50).optional().nullable(),
    grade_number: z.string().max(20).optional().nullable(),
    notes: notesField,
});

export const gradeCreateSchema = gradeSchema.omit({ grade_id: true });

// Student Types
export const studentTypeSchema = z.object({
    student_type_id: idField,
    name: nameField,
    description: z.string().optional().nullable(),
});

export const studentTypeCreateSchema = studentTypeSchema.omit({ student_type_id: true });

// Subject Types
export const subjectTypeSchema = z.object({
    subject_type_id: idField,
    name: nameField,
    notes: notesField,
});

export const subjectTypeCreateSchema = subjectTypeSchema.omit({ subject_type_id: true });

// Class Types
export const classTypeSchema = z.object({
    class_type_id: idField,
    name: nameField,
    notes: notesField,
});

export const classTypeCreateSchema = classTypeSchema.omit({ class_type_id: true });

// Time Slots
export const timeSlotSchema = z.object({
    time_slot_id: idField,
    start_time: timeField.refine(val => val !== null, {
        message: "Start time is required"
    }),
    end_time: timeField.refine(val => val !== null, {
        message: "End time is required"
    }),
    notes: notesField,
});

export const timeSlotCreateSchema = timeSlotSchema.omit({ time_slot_id: true });

// Evaluations
export const evaluationSchema = z.object({
    evaluation_id: idField,
    name: nameField,
    score: z.number().int().optional().nullable(),
    notes: notesField,
});

export const evaluationCreateSchema = evaluationSchema.omit({ evaluation_id: true });

// Booths
export const boothSchema = z.object({
    booth_id: idField,
    name: nameField,
    notes: notesField,
});

// Subjects
export const subjectSchema = z.object({
    subject_id: idField,
    name: nameField,
    subject_type_id: idField.optional().nullable(),
    notes: notesField,
});

export const subjectCreateSchema = subjectSchema.omit({ subject_id: true });

// Students (simplified version)
export const studentSchema = z.object({
    student_id: idField,
    name: nameField,
    kana_name: z.string().max(100).optional().nullable(),
    grade_id: idField.optional().nullable(),
    school_name: z.string().max(100).optional().nullable(),
    school_type: z.string().max(20).optional().nullable(),
    exam_category: z.string().max(50).optional().nullable(),
    first_choice_school: z.string().max(100).optional().nullable(),
    second_choice_school: z.string().max(100).optional().nullable(),
    enrollment_date: dateField,
    birth_date: dateField,
    home_phone: z.string().max(20).optional().nullable(),
    parent_mobile: z.string().max(20).optional().nullable(),
    student_mobile: z.string().max(20).optional().nullable(),
    parent_email: z.string().email().max(100).optional().nullable(),
    notes: notesField,
});

export const studentCreateSchema = studentSchema.omit({ student_id: true });

// Courses (Intensive Courses)
export const courseSchema = z.object({
    course_id: idField,
    name: nameField,
    subject_id: idField.optional().nullable(),
    grade_id: idField.optional().nullable(),
    class_duration: z.string().max(20).optional().nullable(),
    class_sessions: z.string().max(20).optional().nullable(),
    session_type: z.string().max(50).optional().nullable(),
});

export const courseCreateSchema = courseSchema.omit({ course_id: true });

// Teachers
export const teacherSchema = z.object({
    teacher_id: idField,
    name: nameField,
    evaluation_id: idField.optional().nullable(),
    birth_date: dateField,
    mobile_number: z.string().max(20).optional().nullable(),
    email: z.string().email().max(100).optional().nullable(),
    high_school: z.string().max(100).optional().nullable(),
    university: z.string().max(100).optional().nullable(),
    faculty: z.string().max(100).optional().nullable(),
    department: z.string().max(100).optional().nullable(),
    enrollment_status: z.string().max(50).optional().nullable(),
    other_universities: z.string().optional().nullable(),
    english_proficiency: z.string().max(50).optional().nullable(),
    toeic: z.number().int().optional().nullable(),
    toefl: z.number().int().optional().nullable(),
    math_certification: z.string().max(50).optional().nullable(),
    kanji_certification: z.string().max(50).optional().nullable(),
    other_certifications: z.string().optional().nullable(),
    notes: notesField,
});

export const teacherCreateSchema = teacherSchema;

// Create partial schemas for updates
export const gradeUpdateSchema = gradeSchema.partial().omit({ grade_id: true });
export const studentTypeUpdateSchema = studentTypeSchema.partial().omit({ student_type_id: true });
export const subjectTypeUpdateSchema = subjectTypeSchema.partial().omit({ subject_type_id: true });
export const classTypeUpdateSchema = classTypeSchema.partial().omit({ class_type_id: true });
export const timeSlotUpdateSchema = timeSlotSchema.partial().omit({ time_slot_id: true });
export const evaluationUpdateSchema = evaluationSchema.partial().omit({ evaluation_id: true });
export const boothUpdateSchema = boothSchema.partial().omit({ booth_id: true });
export const subjectUpdateSchema = subjectSchema.partial().omit({ subject_id: true });
export const studentUpdateSchema = studentSchema.partial().omit({ student_id: true });
export const courseUpdateSchema = courseSchema.partial().omit({ course_id: true });
export const teacherUpdateSchema = teacherSchema.partial().omit({ teacher_id: true });

