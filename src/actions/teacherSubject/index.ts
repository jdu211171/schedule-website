"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getTeacherSubjects() {
    await requireAuth();

    return prisma.teacherSubject.findMany({
        orderBy: [{ teacherId: "asc" }, { subjectId: "asc" }],
    });
}