'use server';

import { studentTypeSchema, studentTypeUpdateSchema } from '@/lib/validation-schemas';
import prisma from '@/lib/prisma';
import { createCrudActions } from '@/lib/actions-factory';

// No related models were specified in the original routes
const relatedModels: Array<{ model: keyof typeof prisma; field: string }> = [];

const { getAll, create, getById, update, remove } = createCrudActions(
    'student_types',
    'student_type_id',
    studentTypeSchema,
    studentTypeUpdateSchema || studentTypeSchema.partial(),
    relatedModels
);

export async function getStudentTypes() {
    return getAll();
}

export async function createStudentType(data: { name: string; student_type_id: string; description?: string | null | undefined; }) {
    return create(data);
}

export async function getStudentTypeById(id: string) {
    return getById(id);
}

export async function updateStudentType(id: string, data: { [x: string]: never; }) {
    return update(id, data);
}

export async function deleteStudentType(id: string) {
    return remove(id);
}
