"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

interface GetGradesParams {
    page?: number;
    pageSize?: number;
}

export async function getGrades({
                                    page = 1,
                                    pageSize = 10,
                                }: GetGradesParams = {}) {
    await requireAuth();
    const skip = (page - 1) * pageSize;

    return prisma.grade.findMany({
        skip,
        take: pageSize,
        orderBy: {
            name: 'asc',
        },
    });
}
