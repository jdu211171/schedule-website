"use server";

import prisma from "@/lib/prisma";
import { scheduleCreateSchema, ScheduleCreateInput } from "@/schemas/schedule.schema";
import { requireAuth } from "../auth-actions";

export async function createSchedule(data: ScheduleCreateInput) {
    await requireAuth();
    const parsed = scheduleCreateSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { date, startTime, endTime, teacherId, boothId, subjectId, classTypeId, notes, studentIds } = parsed.data;

    const newStartTime = `${startTime}:00`;
    const newEndTime = `${endTime}:00`;

    // Check teacher availability
    const teacherConflicts = await prisma.classSession.findMany({
        where: {
            teacherId,
            date,
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
        },
    });

    // Check booth availability
    const boothConflicts = await prisma.classSession.findMany({
        where: {
            boothId,
            date,
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
        },
    });

    // Check student availability
    if (studentIds && studentIds.length > 0) {
        for (const studentId of studentIds) {
            const studentConflicts = await prisma.studentClassEnrollment.findMany({
                where: {
                    studentId,
                    classSession: {
                        date,
                        startTime: { lt: newEndTime },
                        endTime: { gt: newStartTime },
                    },
                },
            });
            if (studentConflicts.length > 0) {
                throw new Error(`Student ${studentId} is not available at the selected time`);
            }
        }
    }

    if (teacherConflicts.length > 0) {
        throw new Error("Teacher is not available at the selected time");
    }
    if (boothConflicts.length > 0) {
        throw new Error("Booth is not available at the selected time");
    }

    // Create ClassSession
    const classSession = await prisma.classSession.create({
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

    // Enroll students if provided
    if (studentIds && studentIds.length > 0) {
        await prisma.studentClassEnrollment.createMany({
            data: studentIds.map((studentId) => ({
                classId: classSession.classId,
                studentId,
                status: "ENROLLED",
            })),
        });
    }

    return classSession;
}
