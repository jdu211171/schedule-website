"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getSubjectTypes() {
    await requireAuth();

    return prisma.subjectType.findMany({
        orderBy: { name: "asc" },
    });
}