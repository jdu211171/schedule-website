'use server';

import { createCrudActions } from '@/lib/actions-factory';
import { boothSchema, boothUpdateSchema } from '@/lib/validation-schemas';
import prisma from "@/lib/prisma";

const relatedModels = [
    { model: 'class_sessions' as keyof typeof prisma, field: 'booth_id' },
    { model: 'regular_class_templates' as keyof typeof prisma, field: 'booth_id' },
];

const { getAll, create, getById, update, remove } = createCrudActions(
    'booths',
    'booth_id',
    boothSchema,
    boothUpdateSchema,
    relatedModels
);

export async function getBooths() {
    return getAll();
}

export async function createBooth(data: { booth_id: string; name: string; notes?: string | null | undefined; }) {
    return create(data);
}

export async function getBoothById(id: string) {
    return getById(id);
}

export async function updateBooth(id: string, data: { [x: string]: never; }) {
    return update(id, data);
}

export async function deleteBooth(id: string) {
    return remove(id);
}
