"use server";

import prisma from '@/lib/prisma';
import { requireAuth } from '../auth-actions';

export async function getTeachers() {
    await requireAuth();

    return prisma.teacher.findMany({
        orderBy: { name: "asc" },
    });
}