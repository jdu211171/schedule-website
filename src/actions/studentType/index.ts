"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

interface GetStudentTypesParams {
    page?: number;
    pageSize?: number;
}

export async function getStudentTypes({
                                          page = 1,
                                          pageSize = 100,
                                      }: GetStudentTypesParams = {}) {
    await requireAuth();
    const skip = (page - 1) * pageSize;

    return prisma.studentType.findMany({
        skip,
        take: pageSize,
        orderBy: {
            name: 'asc',
        },
    });
}