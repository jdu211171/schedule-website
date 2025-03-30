"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getGrades() {
    await requireAuth();

    return prisma.grade.findMany({
        orderBy: {
            name: 'asc',
        },
    });
}
