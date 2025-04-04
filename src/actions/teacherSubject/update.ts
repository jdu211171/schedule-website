"use server";

import { teacherSubjectCreateSchema, TeacherSubjectCreateInput } from "@/schemas/teacherSubject.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateTeacherSubject(data: TeacherSubjectCreateInput) {
    await requireAuth();

    const parsed = teacherSubjectCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { teacherId, subjectId } = parsed.data;

    await prisma.teacherSubject.update({
        where: {
            teacherId_subjectId: {
                teacherId,
                subjectId,
            },
        },
        data: parsed.data,
    });

    return parsed.data;
}