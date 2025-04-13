"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

interface GetBoothsParams {
    page?: number;
    pageSize?: number;
}

export async function getBooths({
                                    page = 1,
                                    pageSize = 10,
                                }: GetBoothsParams = {}) {
    await requireAuth();
    const skip = (page - 1) * pageSize;

    return prisma.booth.findMany({
        skip,
        take: pageSize,
        orderBy: {
            createdAt: 'desc',
        },
    });
}
