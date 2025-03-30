"use server";

import { GradeCreateInput, gradeCreateSchema } from "@/schemas/grade.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateGrade(data: GradeCreateInput) {
    await requireAuth();

    const parsed = gradeCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    await prisma.grade.create({
        data: parsed.data,
    });

    return parsed.data;
}