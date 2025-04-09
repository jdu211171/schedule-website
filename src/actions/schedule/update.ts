"use server";

import prisma from "@/lib/prisma";
import { scheduleUpdateSchema, ScheduleUpdateInput } from "@/schemas/schedule.schema";
import { requireAuth } from "../auth-actions";

export async function updateSchedule(data: ScheduleUpdateInput) {
    await requireAuth();
    const parsed = scheduleUpdateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { classId, date, startTime, endTime, teacherId, boothId, subjectId, classTypeId, notes, studentIds } = parsed.data;

    const newStartTime = `${startTime}:00`; // Convert 'HH:mm' to 'HH:mm:ss'
    const newEndTime = `${endTime}:00`;

    // Check teacher availability, excluding the current schedule
    const teacherConflicts = await prisma.classSession.findMany({
        where: {
            teacherId,
            date,
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
            classId: { not: classId }, // Exclude the current schedule
        },
    });

    // Check booth availability, excluding the current schedule
    const boothConflicts = await prisma.classSession.findMany({
        where: {
            boothId,
            date,
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
            classId: { not: classId }, // Exclude the current schedule
        },
    });

    if (teacherConflicts.length > 0) {
        throw new Error("Teacher is not available at the selected time");
    }
    if (boothConflicts.length > 0) {
        throw new Error("Booth is not available at the selected time");
    }

    // Update the ClassSession
    const updatedSchedule = await prisma.classSession.update({
        where: { classId },
        data: {
            date,
            startTime: newStartTime,
            endTime: newEndTime,
            teacherId,
            boothId,
            subjectId,
            classTypeId,
            notes,
        },
    });

    // Update student enrollments if provided
    if (studentIds) {
        await prisma.studentClassEnrollment.deleteMany({
            where: { classId },
        });
        await prisma.studentClassEnrollment.createMany({
            data: studentIds.map((studentId) => ({
                classId,
                studentId,
                status: "ENROLLED",
            })),
        });
    }

    return updatedSchedule;
}
