"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getStudentType(id: string) {
    await requireAuth();

    const studentType = await prisma.studentType.findUnique({
        where: { studentTypeId: id },
    });

    if (!studentType) {
        throw new Error("StudentType not found");
    }

    return studentType;
}