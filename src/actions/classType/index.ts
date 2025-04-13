"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

interface GetClassTypesParams {
    page?: number;
    pageSize?: number;
}

export async function getClassTypes({
                                        page = 1,
                                        pageSize = 10,
                                    }: GetClassTypesParams = {}) {
    await requireAuth();
    const skip = (page - 1) * pageSize;

    return prisma.classType.findMany({
        skip,
        take: pageSize,
        orderBy: {
            createdAt: 'desc',
        },
    });
}
