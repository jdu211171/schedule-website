"use server";

import prisma from "@/lib/prisma";
import { availabilityCheckSchema, AvailabilityCheckInput } from "@/schemas/schedule.schema";
import { requireAuth } from "../auth-actions";

export async function checkTeacherAvailability(data: AvailabilityCheckInput) {
    await requireAuth();
    const parsed = availabilityCheckSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { teacherId, date, startTime, endTime } = parsed.data;
    const newStartTime = `${startTime}:00`;
    const newEndTime = `${endTime}:00`;

    const conflicts = await prisma.classSession.findMany({
        where: {
            teacherId,
            date,
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
        },
    });

    return conflicts.length === 0;
}
