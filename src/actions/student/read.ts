"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getStudent(id: string) {
    await requireAuth();

    const student = await prisma.student.findUnique({
        where: {
            studentId: id,
        },
    });

    if (!student) {
        throw new Error("Student not found");
    }

    return student;
}
