'use server';

import { subjectTypeCreateSchema, subjectTypeUpdateSchema } from '@/lib/validation-schemas';
import prisma from '@/lib/prisma';
import { createCrudActions } from '@/lib/actions-factory';

const relatedModels = [
    { model: 'subjects' as keyof typeof prisma, field: 'subject_type_id' },
];

const { getAll, create, getById, update, remove } = createCrudActions(
    'subject_types',
    'subject_type_id',
    subjectTypeCreateSchema,
    subjectTypeUpdateSchema,
    relatedModels
);

export async function getSubjectTypes() {
    return getAll();
}

export async function createSubjectType(data: { name: string; description?: string | null | undefined; }) {
    return create(data);
}

export async function getSubjectTypeById(id: string) {
    return getById(id);
}

export async function updateSubjectType(id: string, data: { name?: string; description?: string | null | undefined; }) {
    return update(id, data);
}

export async function deleteSubjectType(id: string) {
    return remove(id);
}
