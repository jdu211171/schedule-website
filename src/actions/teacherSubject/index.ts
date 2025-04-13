"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

interface GetTeacherSubjectsParams {
    page?: number;
    pageSize?: number;
}

export async function getTeacherSubjects({
                                             page = 1,
                                             pageSize = 10,
                                         }: GetTeacherSubjectsParams = {}) {
    await requireAuth();
    const skip = (page - 1) * pageSize;

    return prisma.teacherSubject.findMany({
        skip,
        take: pageSize,
        orderBy: [{ teacherId: "asc" }, { subjectId: "asc" }],
    });
}
