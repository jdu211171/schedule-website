"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

interface GetEvaluationsParams {
    page?: number;
    pageSize?: number;
}

export async function getEvaluations({
                                         page = 1,
                                         pageSize = 10,
                                     }: GetEvaluationsParams = {}) {
    await requireAuth();
    const skip = (page - 1) * pageSize;

    return prisma.evaluation.findMany({
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
    });
}
