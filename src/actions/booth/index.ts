"use server";

import prisma from "@/lib/prisma";
import {requireAuth} from "../auth-actions";

interface GetBoothsParams {
    page?: number;
    pageSize?: number;
}

export async function getBooths({
                                    page = 1,
                                    pageSize = 15,
                                }: GetBoothsParams = {}) {
    await requireAuth();
    const skip = (page - 1) * pageSize;

    return prisma.booth.findMany({
        skip,
        take: pageSize,
        orderBy: {
            name: 'asc',
        },
    });
}
