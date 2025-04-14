"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteStudentType(id: string) {
    await requireAuth();

    const item = await prisma.studentType.findUnique({
        where: { studentTypeId: id },
    });

    if (!item) {
        throw new Error("StudentType not found");
    }

    await prisma.studentType.delete({
        where: { studentTypeId: id },
    });

    return { message: "StudentType deleted successfully" };
}