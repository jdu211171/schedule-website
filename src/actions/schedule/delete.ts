"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function deleteSchedule(classId: string) {
    await requireAuth();
    await prisma.classSession.delete({
        where: { classId },
    });
    return { message: "Schedule deleted successfully" };
}
