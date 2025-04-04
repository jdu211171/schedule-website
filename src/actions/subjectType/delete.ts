"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteSubjectType(id: string) {
    await requireAuth();

    const item = await prisma.subjectType.findUnique({
        where: { subjectTypeId: id },
    });

    if (!item) {
        throw new Error("SubjectType not found");
    }

    await prisma.subjectType.delete({
        where: { subjectTypeId: id },
    });

    return { message: "SubjectType deleted successfully" };
}