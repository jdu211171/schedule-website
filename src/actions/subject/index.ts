"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getSubjects() {
    await requireAuth();

    return prisma.subject.findMany({
        orderBy: { name: "asc" },
        include: {
            subjectType: true
        }
    });
}