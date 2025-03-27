import { gradeCreateSchema, gradeUpdateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';
import prisma from "@/lib/prisma";

const relatedModels = [
    { model: 'intensive_courses' as keyof typeof prisma, field: 'grade_id' },
    { model: 'students' as keyof typeof prisma, field: 'grade_id' }
];

const { getOne, update, remove } = createCrudHandlers(
    'grades',
    'grade_id',
    gradeCreateSchema,
    gradeUpdateSchema,
    relatedModels
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;
