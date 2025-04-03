"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteTeacherSubject(teacherId: string, subjectId: string) {
    await requireAuth();

    const item = await prisma.teacherSubject.findUnique({
        where: {
            teacherId_subjectId: {
                teacherId,
                subjectId,
            },
        },
    });

    if (!item) {
        throw new Error("TeacherSubject not found");
    }

    await prisma.teacherSubject.delete({
        where: {
            teacherId_subjectId: {
                teacherId,
                subjectId,
            },
        },
    });

    return { message: "TeacherSubject deleted successfully" };
}