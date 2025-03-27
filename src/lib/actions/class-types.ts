'use server';

import { classTypeCreateSchema, classTypeUpdateSchema } from '@/lib/validation-schemas';
import prisma from '@/lib/prisma';
import { createCrudActions } from '@/lib/actions-factory';

const relatedModels = [
    { model: 'class_sessions' as keyof typeof prisma, field: 'class_type_id' },
    { model: 'student_special_preferences' as keyof typeof prisma, field: 'class_type_id' }
];

const { getAll, create, getById, update, remove } = createCrudActions(
    'class_types',
    'class_type_id',
    classTypeCreateSchema,
    classTypeUpdateSchema,
    relatedModels
);

export async function getClassTypes() {
    return getAll();
}

export async function createClassType(data: { name: string; notes?: string | null | undefined; }) {
    return create(data);
}

export async function getClassTypeById(id: string) {
    return getById(id);
}

export async function updateClassType(id: string, data: { [x: string]: never; }) {
    return update(id, data);
}

export async function deleteClassType(id: string) {
    return remove(id);
}
