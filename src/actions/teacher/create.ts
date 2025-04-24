"use server";

import { teacherCreateSchema, TeacherCreateInput } from '@/schemas/teacher.schema';
import { requireAuth } from '../auth-actions';
import prisma from '@/lib/prisma';

export async function createTeacher(data: TeacherCreateInput) {
    await requireAuth();

    const parsed = teacherCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { username, password, ...teacherData } = parsed.data;

    return prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                username,
                passwordHash: password,
                role: "TEACHER",
            },
        });

        const teacher = await tx.teacher.create({
            data: {
                ...teacherData,
                userId: user.id,
            },
        });

        return teacher;
    });
}