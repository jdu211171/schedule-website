"use server";

import prisma from '@/lib/prisma';
import { requireAuth } from '../auth-actions';

interface GetTeachersParams {
    page?: number;
    pageSize?: number;
}

export async function getTeachers({
                                      page = 1,
                                      pageSize = 15,
                                  }: GetTeachersParams = {}) {
    await requireAuth();
    const skip = (page - 1) * pageSize;

    return prisma.teacher.findMany({
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
    });
}
