"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteStudentSubject(studentId: string, subjectId: string) {
    await requireAuth();

    const item = await prisma.studentSubject.findUnique({
        where: {
            studentId_subjectId: {
                studentId,
                subjectId,
            },
        },
    });

    if (!item) {
        throw new Error("StudentSubject not found");
    }

    await prisma.studentSubject.delete({
        where: {
            studentId_subjectId: {
                studentId,
                subjectId,
            },
        },
    });

    return { message: "StudentSubject deleted successfully" };
}