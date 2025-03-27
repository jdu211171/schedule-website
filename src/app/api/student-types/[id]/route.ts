import { studentTypeUpdateSchema, studentTypeCreateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getOne, update, remove } = createCrudHandlers(
    'student_types',
    'student_type_id',
    studentTypeCreateSchema,
    studentTypeUpdateSchema,
    []
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;
