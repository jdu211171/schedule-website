'use server';

import { gradeCreateSchema, gradeUpdateSchema } from '@/lib/validation-schemas';
import prisma from '@/lib/prisma';
import { createCrudActions } from '@/lib/actions-factory';

const relatedModels = [
    { model: 'intensive_courses' as keyof typeof prisma, field: 'grade_id' },
    { model: 'students' as keyof typeof prisma, field: 'grade_id' }
];

const { getAll, create, getById, update, remove } = createCrudActions(
    'grades',
    'grade_id',
    gradeCreateSchema,
    gradeUpdateSchema,
    relatedModels
);

export async function getGrades() {
    return getAll();
}

export async function createGrade(data: { name: string; notes?: string | null | undefined; grade_type?: string | null | undefined; grade_number?: string | null | undefined; }) {
    return create(data);
}

export async function getGradeById(id: string) {
    return getById(id);
}

export async function updateGrade(id: string, data: { [x: string]: never; }) {
    return update(id, data);
}

export async function deleteGrade(id: string) {
    return remove(id);
}
