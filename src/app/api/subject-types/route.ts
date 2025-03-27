import { subjectTypeSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getAll, create } = createCrudHandlers(
    'subject_types',
    'subject_type_id',
    subjectTypeSchema,
    undefined,
    []
);

export const GET = getAll;
export const POST = create;