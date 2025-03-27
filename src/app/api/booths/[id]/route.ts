import { boothSchema, boothUpdateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';
import prisma from "@/lib/prisma";

const relatedModels = [
    { model: 'class_sessions' as keyof typeof prisma, field: 'booth_id' },
    { model: 'regular_class_templates' as keyof typeof prisma, field: 'booth_id' }
];

const { getOne, update, remove } = createCrudHandlers(
    'booths',
    'booth_id',
    boothSchema,
    boothUpdateSchema,
    relatedModels
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;
