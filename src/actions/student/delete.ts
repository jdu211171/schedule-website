"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteStudent(id: string) {
    await requireAuth();

    const student = await prisma.student.findUnique({
        where: {
            studentId: id,
        },
    });


    if (!student) {
        throw new Error("Student not found");
    }

    await prisma.student.delete({
        where: {
            studentId: id,
        },
    });

    return { message: "Student deleted successfully" };
}