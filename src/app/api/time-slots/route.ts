import { timeSlotSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getAll, create } = createCrudHandlers(
    'time_slots',
    'time_slot_id',
    timeSlotSchema,
    undefined,
    []
);

export const GET = getAll;
export const POST = create;