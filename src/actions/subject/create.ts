"use server";

import { subjectCreateSchema, SubjectCreateInput } from "@/schemas/subject.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function createSubject(data: SubjectCreateInput) {
    await requireAuth();

    const parsed = subjectCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    await prisma.subject.create({
        data: parsed.data,
    });

    return parsed.data;
}