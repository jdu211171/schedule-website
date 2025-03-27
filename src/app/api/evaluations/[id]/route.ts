import { evaluationCreateSchema, evaluationUpdateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';
import prisma from "@/lib/prisma";

const relatedModels = [
    { model: 'teachers' as keyof typeof prisma, field: 'evaluation_id' }
];

const { getOne, update, remove } = createCrudHandlers(
    'evaluations',
    'evaluation_id',
    evaluationCreateSchema,
    evaluationUpdateSchema,
    relatedModels
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;
