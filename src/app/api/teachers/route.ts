import { teacherCreateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getAll, create } = createCrudHandlers(
    'teachers',
    'teacher_id',
    teacherCreateSchema,
    undefined,
    []
);

export const GET = getAll;
export const POST = create;