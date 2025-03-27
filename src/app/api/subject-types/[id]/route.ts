import { subjectTypeUpdateSchema, subjectTypeCreateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';
import prisma from "@/lib/prisma";

const relatedModels = [
    { model: 'subjects' as keyof typeof prisma, field: 'subject_type_id' },
];

const { getOne, update, remove } = createCrudHandlers(
    'subject_types',
    'subject_type_id',
    subjectTypeCreateSchema,
    subjectTypeUpdateSchema,
    relatedModels
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;
