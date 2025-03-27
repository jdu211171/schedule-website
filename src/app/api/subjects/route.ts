import { subjectSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getAll, create } = createCrudHandlers(
    'subjects',
    'subject_id',
    subjectSchema,
    undefined,
    []
);

export const GET = getAll;
export const POST = create;