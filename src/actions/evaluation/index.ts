"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getEvaluations() {
    await requireAuth();

    return prisma.evaluation.findMany({
        orderBy: { name: "asc" },
    });
}