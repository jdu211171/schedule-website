import { gradeSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getAll, create } = createCrudHandlers(
    'grades',
    'grade_id',
    gradeSchema,
    undefined,
    []
);

export const GET = getAll;
export const POST = create;