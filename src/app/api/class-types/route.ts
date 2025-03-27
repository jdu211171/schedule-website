import { classTypeSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getAll, create } = createCrudHandlers(
    'class_types',
    'class_type_id',
    classTypeSchema,
    undefined,
    []
);

export const GET = getAll;
export const POST = create;