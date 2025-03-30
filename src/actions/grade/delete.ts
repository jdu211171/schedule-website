"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteGrade(id: string) {
    await requireAuth();

    const grade = await prisma.grade.findUnique({
        where: {
            gradeId: id,
        },
    });


    if (!grade) {
        throw new Error("Grade not found");
    }

    await prisma.grade.delete({
        where: {
            gradeId: id,
        },
    });

    return { message: "Grade deleted successfully" };
}