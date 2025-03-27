import { courseSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getAll, create } = createCrudHandlers(
    'intensive_courses',
    'course_id',
    courseSchema,
    undefined,
    []
);

export const GET = getAll;
export const POST = create;