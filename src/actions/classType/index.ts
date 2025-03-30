"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getClassTypes() {
    await requireAuth();

    return prisma.classType.findMany({
        orderBy: {
            name: 'asc',
        },
    });
}
