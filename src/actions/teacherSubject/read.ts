"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getTeacherSubject(teacherId: string, subjectId: string) {
    await requireAuth();

    const record = await prisma.teacherSubject.findUnique({
        where: {
            teacherId_subjectId: {
                teacherId,
                subjectId,
            },
        },
    });

    if (!record) {
        throw new Error("TeacherSubject not found");
    }

    return record;
}