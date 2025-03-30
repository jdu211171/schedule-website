"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getSubjectType(id: string) {
    await requireAuth();

    const subjectType = await prisma.subjectType.findUnique({
        where: { subjectTypeId: id },
    });

    if (!subjectType) {
        throw new Error("SubjectType not found");
    }

    return subjectType;
}