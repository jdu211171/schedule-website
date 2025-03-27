import { courseCreateSchema, courseUpdateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';
import prisma from "@/lib/prisma";

const relatedModels = [
    { model: 'course_assignments' as keyof typeof prisma, field: 'course_id' },
    { model: 'course_enrollments' as keyof typeof prisma, field: 'course_id' }
];

const { getOne, update, remove } = createCrudHandlers(
    'intensive_courses',
    'course_id',
    courseCreateSchema,
    courseUpdateSchema,
    relatedModels
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;
