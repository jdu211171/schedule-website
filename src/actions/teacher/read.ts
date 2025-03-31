"use server";

import prisma from '@/lib/prisma';
import { requireAuth } from '../auth-actions';

export async function getTeacher(teacherId: string) {
    await requireAuth();

    const teacher = await prisma.teacher.findUnique({
        where: { teacherId },
    });

    if (!teacher) {
        throw new Error("Teacher not found");
    }

    return teacher;
}