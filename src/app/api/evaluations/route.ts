import { evaluationSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getAll, create } = createCrudHandlers(
    'evaluations',
    'evaluation_id',
    evaluationSchema,
    undefined,
    []
);

export const GET = getAll;
export const POST = create;