"use server";

import { teacherSubjectCreateSchema, TeacherSubjectCreateInput } from "@/schemas/teacherSubject.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";

export async function createTeacherSubject(data: TeacherSubjectCreateInput) {
    await requireAuth();

    const parsed = teacherSubjectCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    await prisma.teacherSubject.create({
        data: parsed.data,
    });

    return parsed.data;
}