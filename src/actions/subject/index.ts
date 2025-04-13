"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

interface GetSubjectsParams {
    page?: number;
    pageSize?: number;
}

export async function getSubjects({
                                      page = 1,
                                      pageSize = 10,
                                  }: GetSubjectsParams = {}) {
    await requireAuth();
    const skip = (page - 1) * pageSize;

    return prisma.subject.findMany({
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
        include: {
            subjectType: true
        }
    });
}
