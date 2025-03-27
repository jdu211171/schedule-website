import { teacherCreateSchema, teacherUpdateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';
import prisma from "@/lib/prisma";

const relatedModels = [
    { model: 'class_sessions' as keyof typeof prisma, field: 'teacher_id' },
    { model: 'course_assignments' as keyof typeof prisma, field: 'teacher_id' },
    { model: 'regular_class_templates' as keyof typeof prisma, field: 'teacher_id' },
    { model: 'teacher_regular_shifts' as keyof typeof prisma, field: 'teacher_id' },
    { model: 'teacher_special_shifts' as keyof typeof prisma, field: 'teacher_id' },
    { model: 'teacher_subjects' as keyof typeof prisma, field: 'teacher_id' }
];

const { getOne, update, remove } = createCrudHandlers(
    'teachers',
    'teacher_id',
    teacherCreateSchema,
    teacherUpdateSchema,
    relatedModels
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;