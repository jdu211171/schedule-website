'use server';

import { teacherCreateSchema, teacherUpdateSchema } from '@/lib/validation-schemas';
import prisma from '@/lib/prisma';
import { createCrudActions } from '@/lib/actions-factory';

const relatedModels = [
    { model: 'class_sessions' as keyof typeof prisma, field: 'teacher_id' },
    { model: 'course_assignments' as keyof typeof prisma, field: 'teacher_id' },
    { model: 'regular_class_templates' as keyof typeof prisma, field: 'teacher_id' },
    { model: 'teacher_regular_shifts' as keyof typeof prisma, field: 'teacher_id' },
    { model: 'teacher_special_shifts' as keyof typeof prisma, field: 'teacher_id' },
    { model: 'teacher_subjects' as keyof typeof prisma, field: 'teacher_id' }
];

const { getAll, create, getById, update, remove } = createCrudActions(
    'teachers',
    'teacher_id',
    teacherCreateSchema,
    teacherUpdateSchema,
    relatedModels
);

export async function getTeachers() {
    return getAll();
}

export async function createTeacher(data: { name: string; teacher_id: string; notes?: string | null | undefined; evaluation_id?: string | null | undefined; birth_date?: Date | null | undefined; mobile_number?: string | null | undefined; email?: string | null | undefined; high_school?: string | null | undefined; university?: string | null | undefined; faculty?: string | null | undefined; department?: string | null | undefined; enrollment_status?: string | null | undefined; other_universities?: string | null | undefined; english_proficiency?: string | null | undefined; toeic?: number | null | undefined; toefl?: number | null | undefined; math_certification?: string | null | undefined; kanji_certification?: string | null | undefined; other_certifications?: string | null | undefined; }) {
    return create(data);
}

export async function getTeacherById(id: string) {
    return getById(id);
}

export async function updateTeacher(id: string, data: { [x: string]: never; }) {
    return update(id, data);
}

export async function deleteTeacher(id: string) {
    return remove(id);
}
