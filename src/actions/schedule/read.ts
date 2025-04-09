"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getSchedule(classId: string) {
    await requireAuth();
    const schedule = await prisma.classSession.findUnique({
        where: { classId },
    });
    if (!schedule) {
        throw new Error("Schedule not found");
    }
    return schedule;
}
