"use server";

import { subjectCreateSchema, SubjectCreateInput } from "@/schemas/subject.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateSubject(data: SubjectCreateInput) {
    await requireAuth();

    const parsed = subjectCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { subjectId } = parsed.data;

    await prisma.subject.update({
        where: { subjectId },
        data: parsed.data,
    });

    return parsed.data;
}