"use server";

import { subjectUpdateSchema, SubjectUpdateInput } from "@/schemas/subject.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateSubject(data: SubjectUpdateInput) {
    await requireAuth();

    const parsed = subjectUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { subjectId, ...updateData } = parsed.data;

    await prisma.subject.update({
        where: { subjectId },
        data: updateData,
    });

    return prisma.subject.findUnique({
        where: {subjectId},
    });
}