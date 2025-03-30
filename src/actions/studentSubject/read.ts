"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getStudentSubject(studentId: string, subjectId: string) {
    await requireAuth();

    const record = await prisma.studentSubject.findUnique({
        where: {
            studentId_subjectId: {
                studentId,
                subjectId,
            },
        },
    });

    if (!record) {
        throw new Error("StudentSubject not found");
    }

    return record;
}