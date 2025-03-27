import { classTypeCreateSchema, classTypeUpdateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';
import prisma from '@/lib/prisma';

const relatedModels = [
    { model: 'class_sessions' as keyof typeof prisma, field: 'class_type_id' },
    { model: 'student_special_preferences' as keyof typeof prisma, field: 'class_type_id' }
];

const { getOne, update, remove } = createCrudHandlers(
    'class_types',
    'class_type_id',
    classTypeCreateSchema,
    classTypeUpdateSchema,
    relatedModels
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;
