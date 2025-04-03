"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteSubject(id: string) {
    await requireAuth();

    const item = await prisma.subject.findUnique({
        where: { subjectId: id },
    });

    if (!item) {
        throw new Error("Subject not found");
    }

    await prisma.subject.delete({
        where: { subjectId: id },
    });

    return { message: "Subject deleted successfully" };
}