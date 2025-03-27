import { subjectCreateSchema, subjectUpdateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';
import prisma from "@/lib/prisma";

const relatedModels = [
    { model: 'class_sessions' as keyof typeof prisma, field: 'subject_id' },
    { model: 'intensive_courses' as keyof typeof prisma, field: 'subject_id' },
    { model: 'regular_class_templates' as keyof typeof prisma, field: 'subject_id' },
    { model: 'student_regular_preferences' as keyof typeof prisma, field: 'subject_id' },
    { model: 'student_special_preferences' as keyof typeof prisma, field: 'subject_id' },
    { model: 'student_subjects' as keyof typeof prisma, field: 'subject_id' },
    { model: 'teacher_subjects' as keyof typeof prisma, field: 'subject_id' }
];

const { getOne, update, remove } = createCrudHandlers(
    'subjects',
    'subject_id',
    subjectCreateSchema,
    subjectUpdateSchema,
    relatedModels
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;
