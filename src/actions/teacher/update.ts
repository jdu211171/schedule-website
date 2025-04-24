"use server";

import { teacherUpdateSchema, TeacherUpdateInput } from '@/schemas/teacher.schema';
import { requireAuth } from '../auth-actions';
import prisma from '@/lib/prisma';

export async function updateTeacher(data: TeacherUpdateInput) {
    await requireAuth();

    const parsed = teacherUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { teacherId, username, password, ...updateData } = parsed.data;

    return prisma.$transaction(async (tx) => {
        // Update the teacher
        await tx.teacher.update({
            where: { teacherId },
            data: updateData,
        });

        // Update the user credentials if provided
        if (username || password) {
            await tx.user.update({
                where: { id: teacherId },
                data: {
                    ...(username && { username }),
                    ...(password && { passwordHash: password }),
                },
            });
        }

        // Fetch and return the updated teacher
        return tx.teacher.findUnique({
            where: { teacherId },
        });
    });
}