"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getStudentSubjects() {
    await requireAuth();

    return prisma.studentSubject.findMany({
        orderBy: [{ studentId: "asc" }, { subjectId: "asc" }],
    });
}