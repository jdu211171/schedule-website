"use server";

import { subjectTypeUpdateSchema, SubjectTypeUpdateInput } from "@/schemas/subjectType.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateSubjectType(data: SubjectTypeUpdateInput) {
    await requireAuth();

    const parsed = subjectTypeUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { subjectTypeId, ...updateData } = parsed.data;

    await prisma.subjectType.update({
        where: { subjectTypeId },
        data: updateData,
    });

    return prisma.subjectType.findUnique({
        where: {subjectTypeId},
    });
}