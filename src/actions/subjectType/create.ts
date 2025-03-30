"use server";

import { subjectTypeCreateSchema, SubjectTypeCreateInput } from "@/schemas/subjectType.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function createSubjectType(data: SubjectTypeCreateInput) {
    await requireAuth();

    const parsed = subjectTypeCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    await prisma.subjectType.create({
        data: parsed.data,
    });

    return parsed.data;
}