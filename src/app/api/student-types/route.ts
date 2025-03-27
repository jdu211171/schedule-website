import { studentTypeSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getAll, create } = createCrudHandlers(
    'student_types',
    'student_type_id',
    studentTypeSchema,
    undefined,
    []
);

export const GET = getAll;
export const POST = create;