"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getStudents() {
    await requireAuth();

    return prisma.student.findMany({
        orderBy: {
            name: 'asc',
        },
    });
}
