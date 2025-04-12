"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

interface GetSubjectTypesParams {
    page?: number;
    pageSize?: number;
}

export async function getSubjectTypes({
                                          page = 1,
                                          pageSize = 15,
                                      }: GetSubjectTypesParams = {}) {
    await requireAuth();
    const skip = (page - 1) * pageSize;

    return prisma.subjectType.findMany({
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
    });
}
