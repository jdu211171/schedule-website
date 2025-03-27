import { timeSlotCreateSchema, timeSlotUpdateSchema } from '@/lib/validation-schemas';
import { createCrudHandlers } from '@/lib/api-factory';

const { getOne, update, remove } = createCrudHandlers(
    'time_slots',
    'time_slot_id',
    timeSlotCreateSchema,
    timeSlotUpdateSchema,
    []
);

export const GET = getOne;
export const PATCH = update;
export const DELETE = remove;
