"use server";

import { StudentCreateInput, studentCreateSchema } from "@/schemas/student.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function createStudent(data: StudentCreateInput) {
    await requireAuth();

    const parsed = studentCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    // Let Prisma handle ID generation with cuid() if not provided
    const student = await prisma.student.create({
        data: parsed.data,
    });

    return student;
}
