"use server";

import { teacherCreateSchema, TeacherCreateInput } from '@/schemas/teacher.schema';
import { requireAuth } from '../auth-actions';
import prisma from '@/lib/prisma';

export async function updateTeacher(data: TeacherCreateInput) {
    await requireAuth();

    const parsed = teacherCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { teacherId } = parsed.data;

    await prisma.teacher.update({
        where: { teacherId },
        data: parsed.data,
    });

    return parsed.data;
}