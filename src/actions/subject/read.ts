"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getSubject(id: string) {
    await requireAuth();

    const subject = await prisma.subject.findUnique({
        where: { subjectId: id },
    });

    if (!subject) {
        throw new Error("Subject not found");
    }

    return subject;
}