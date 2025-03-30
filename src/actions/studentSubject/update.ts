"use server";

import { studentSubjectCreateSchema, StudentSubjectCreateInput } from "@/schemas/studentSubject.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateStudentSubject(data: StudentSubjectCreateInput) {
    await requireAuth();

    const parsed = studentSubjectCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { studentId, subjectId } = parsed.data;

    await prisma.studentSubject.update({
        where: {
            studentId_subjectId: {
                studentId,
                subjectId,
            },
        },
        data: parsed.data,
    });

    return parsed.data;
}