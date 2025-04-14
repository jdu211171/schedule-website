"use server";

import { StudentTypeCreateInput, studentTypeCreateSchema } from "@/schemas/studentType.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function createStudentType(data: StudentTypeCreateInput) {
    await requireAuth();

    const parsed = studentTypeCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    await prisma.studentType.create({
        data: parsed.data,
    });

    return parsed.data;
}