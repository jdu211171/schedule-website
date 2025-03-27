'use server';

import { createCrudActions } from '@/lib/actions-factory';
import { courseSchema, courseUpdateSchema } from '@/lib/validation-schemas';
import prisma from "@/lib/prisma";

const relatedModels = [
    { model: 'course_assignments' as keyof typeof prisma, field: 'course_id' },
    { model: 'course_enrollments' as keyof typeof prisma, field: 'course_id' }
];

const { getAll, create, getById, update, remove } = createCrudActions(
    'intensive_courses',
    'course_id',
    courseSchema,
    courseUpdateSchema,
    relatedModels
);

export async function getCourses() {
    return getAll();
}

export async function createCourse(data: { name: string; course_id: string; class_sessions?: string | null | undefined; subject_id?: string | null | undefined; grade_id?: string | null | undefined; class_duration?: string | null | undefined; session_type?: string | null | undefined; }) {
    return create(data);
}

export async function getCourseById(id: string) {
    return getById(id);
}

export async function updateCourse(id: string, data: { [x: string]: never; }) {
    return update(id, data);
}

export async function deleteCourse(id: string) {
    return remove(id);
}
