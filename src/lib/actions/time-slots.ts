'use server';

import { timeSlotCreateSchema, timeSlotUpdateSchema } from '@/lib/validation-schemas';
import prisma from '@/lib/prisma';
import { createCrudActions } from '@/lib/actions-factory';

// No related models were defined in the original API routes
const relatedModels: Array<{ model: keyof typeof prisma; field: string }> = [];

const { getAll, create, getById, update, remove } = createCrudActions(
    'time_slots',
    'time_slot_id',
    timeSlotCreateSchema,
    timeSlotUpdateSchema,
    relatedModels
);

export async function getTimeSlots() {
    return getAll();
}

export async function createTimeSlot(data: { notes?: string | null | undefined; start_time?: Date | undefined; end_time?: Date | undefined; }) {
    return create(data);
}

export async function getTimeSlotById(id: string) {
    return getById(id);
}

export async function updateTimeSlot(id: string, data: { [x: string]: never; }) {
    return update(id, data);
}

export async function deleteTimeSlot(id: string) {
    return remove(id);
}
