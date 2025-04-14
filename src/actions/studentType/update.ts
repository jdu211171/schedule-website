"use server";

import { studentTypeUpdateSchema, StudentTypeUpdateInput } from "@/schemas/studentType.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateStudentType(data: StudentTypeUpdateInput) {
    await requireAuth();

    const parsed = studentTypeUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { studentTypeId, ...updateData } = parsed.data;

    await prisma.studentType.update({
        where: { studentTypeId },
        data: updateData,
    });

    return prisma.studentType.findUnique({
        where: { studentTypeId },
    });
}