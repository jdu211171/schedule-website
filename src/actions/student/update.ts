"use server";

import { StudentCreateInput, studentCreateSchema } from "@/schemas/student.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function updateStudent(data: StudentCreateInput) {
    await requireAuth();

    const parsed = studentCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    await prisma.student.create({
        data: parsed.data,
    });

    return parsed.data;
}