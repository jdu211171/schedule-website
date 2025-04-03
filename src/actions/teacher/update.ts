"use server";

import { teacherUpdateSchema, TeacherUpdateInput} from '@/schemas/teacher.schema';
import { requireAuth } from '../auth-actions';
import prisma from '@/lib/prisma';

export async function updateTeacher(data: TeacherUpdateInput) {
    await requireAuth();

    const parsed = teacherUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { teacherId, ...updateData } = parsed.data;

    await prisma.teacher.update({
        where: { teacherId },
        data: updateData,
    });

    return prisma.teacher.findUnique({
        where: {teacherId},
    });
}