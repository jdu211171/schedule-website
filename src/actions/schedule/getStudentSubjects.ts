"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";

export async function getStudentSubjects(studentId: string) {
    await requireAuth();
    const enrollments = await prisma.studentSubjectEnrollment.findMany({
        where: { studentId },
        include: { subject: true },
    });
    return enrollments.map((enrollment) => enrollment.subject);
}
