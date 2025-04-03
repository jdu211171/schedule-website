"use server";

import { GradeUpdateInput, gradeUpdateSchema } from "@/schemas/grade.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateGrade(data: GradeUpdateInput) {
    await requireAuth();

    if (!data.gradeId) {
        throw new Error("Grade ID is required for updates");
    }

    const parsed = gradeUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { gradeId, ...updateData } = parsed.data;

    await prisma.grade.update({
        where: {
            gradeId: gradeId,
        },
        data: updateData,
    });

    return parsed.data;
}
