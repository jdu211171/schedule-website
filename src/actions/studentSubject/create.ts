"use server";

import { studentSubjectCreateSchema, StudentSubjectCreateInput } from "@/schemas/studentSubject.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function createStudentSubject(data: StudentSubjectCreateInput) {
    await requireAuth();

    const parsed = studentSubjectCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    await prisma.studentSubject.create({
        data: parsed.data,
    });

    return parsed.data;
}