"use server";

import { StudentUpdateInput, studentUpdateSchema } from "@/schemas/student.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateStudent(data: StudentUpdateInput) {
    await requireAuth();

    const parsed = studentUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { studentId, ...updateData } = parsed.data;
    
    const student = await prisma.student.update({
        where: { studentId },
        data: updateData,
    });

    return student;
}
