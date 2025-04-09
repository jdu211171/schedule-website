"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getAvailableTeachersForSubject(
    subjectId: string,
    date: string,
    startTime: string,
    endTime: string
) {
    await requireAuth();
    const newStartTime = `${startTime}:00`; // Convert to HH:mm:ss
    const newEndTime = `${endTime}:00`;

    // Find teachers who teach this subject
    const teachers = await prisma.teacher.findMany({
        where: {
            teacherSubjects: {
                some: { subjectId },
            },
        },
    });

    // Filter teachers by availability
    const availableTeachers = [];
    for (const teacher of teachers) {
        const conflicts = await prisma.classSession.findMany({
            where: {
                teacherId: teacher.teacherId,
                date,
                startTime: { lt: newEndTime },
                endTime: { gt: newStartTime },
            },
        });
        if (conflicts.length === 0) {
            availableTeachers.push(teacher);
        }
    }
    return availableTeachers;
}