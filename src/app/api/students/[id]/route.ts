import { studentCreateSchema, studentUpdateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';
import prisma from "@/lib/prisma";

const relatedModels = [
    { model: 'course_enrollments' as keyof typeof prisma, field: 'student_id' },
    { model: 'student_class_enrollments' as keyof typeof prisma, field: 'student_id' },
    { model: 'student_regular_preferences' as keyof typeof prisma, field: 'student_id' },
    { model: 'student_special_preferences' as keyof typeof prisma, field: 'student_id' },
    { model: 'student_subjects' as keyof typeof prisma, field: 'student_id' },
    { model: 'template_student_assignments' as keyof typeof prisma, field: 'student_id' }
];

const { getOne, update, remove } = createCrudHandlers(
    'students',
    'student_id',
    studentCreateSchema,
    studentUpdateSchema,
    relatedModels
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;
