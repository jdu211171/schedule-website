import { boothSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getAll, create } = createCrudHandlers(
    'booths',
    'booth_id',
    boothSchema,
    undefined,
    []
);

export const GET = getAll;
export const POST = create;