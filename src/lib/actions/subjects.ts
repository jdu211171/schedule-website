'use server';

import { subjectCreateSchema, subjectUpdateSchema } from '@/lib/validation-schemas';
import prisma from '@/lib/prisma';
import { createCrudActions } from '@/lib/actions-factory';

const relatedModels = [
    { model: 'class_sessions' as keyof typeof prisma, field: 'subject_id' },
    { model: 'intensive_courses' as keyof typeof prisma, field: 'subject_id' },
    { model: 'regular_class_templates' as keyof typeof prisma, field: 'subject_id' },
    { model: 'student_regular_preferences' as keyof typeof prisma, field: 'subject_id' },
    { model: 'student_special_preferences' as keyof typeof prisma, field: 'subject_id' },
    { model: 'student_subjects' as keyof typeof prisma, field: 'subject_id' },
    { model: 'teacher_subjects' as keyof typeof prisma, field: 'subject_id' }
];

const { getAll, create, getById, update, remove } = createCrudActions(
    'subjects',
    'subject_id',
    subjectCreateSchema,
    subjectUpdateSchema,
    relatedModels
);

export async function getSubjects() {
    return getAll();
}

export async function createSubject(data: { name: string; notes?: string | null | undefined; subject_type_id?: string | null | undefined; }) {
    return create(data);
}

export async function getSubjectById(id: string) {
    return getById(id);
}

export async function updateSubject(id: string, data: { [x: string]: never; }) {
    return update(id, data);
}

export async function deleteSubject(id: string) {
    return remove(id);
}
