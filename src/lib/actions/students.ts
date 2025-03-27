'use server';

import { studentCreateSchema, studentUpdateSchema } from '@/lib/validation-schemas';
import prisma from '@/lib/prisma';
import { createCrudActions } from '@/lib/actions-factory';

const relatedModels = [
    { model: 'course_enrollments' as keyof typeof prisma, field: 'student_id' },
    { model: 'student_class_enrollments' as keyof typeof prisma, field: 'student_id' },
    { model: 'student_regular_preferences' as keyof typeof prisma, field: 'student_id' },
    { model: 'student_special_preferences' as keyof typeof prisma, field: 'student_id' },
    { model: 'student_subjects' as keyof typeof prisma, field: 'student_id' },
    { model: 'template_student_assignments' as keyof typeof prisma, field: 'student_id' }
];

const { getAll, create, getById, update, remove } = createCrudActions(
    'students',
    'student_id',
    studentCreateSchema,
    studentUpdateSchema,
    relatedModels
);

export async function getStudents() {
    return getAll();
}

export async function createStudent(data: { name: string; notes?: string | null | undefined; kana_name?: string | null | undefined; grade_id?: string | null | undefined; school_name?: string | null | undefined; school_type?: string | null | undefined; exam_category?: string | null | undefined; first_choice_school?: string | null | undefined; second_choice_school?: string | null | undefined; enrollment_date?: Date | null | undefined; birth_date?: Date | null | undefined; home_phone?: string | null | undefined; parent_mobile?: string | null | undefined; student_mobile?: string | null | undefined; parent_email?: string | null | undefined; }) {
    return create(data);
}

export async function getStudentById(id: string) {
    return getById(id);
}

export async function updateStudent(id: string, data: { [x: string]: never; }) {
    return update(id, data);
}

export async function deleteStudent(id: string) {
    return remove(id);
}
