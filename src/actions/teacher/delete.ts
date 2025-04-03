"use server";

import prisma from '@/lib/prisma';
import { requireAuth } from '../auth-actions';

export async function deleteTeacher(teacherId: string) {
    await requireAuth();

    const item = await prisma.teacher.findUnique({
        where: { teacherId },
    });

    if (!item) {
        throw new Error("Teacher not found");
    }

    await prisma.teacher.delete({
        where: { teacherId },
    });

    return { message: "Teacher deleted successfully" };
}