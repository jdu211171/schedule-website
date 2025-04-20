"use server";

import { studentUpdateSchema } from "@/schemas/student.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { studentPreferencesSchema } from "@/schemas/student-preferences.schema";

const updateStudentWithPreferenceSchema = z.object({
    student: studentUpdateSchema,
    preferences: studentPreferencesSchema.optional()
});

type UpdateStudentWithPreferenceInput = z.infer<typeof updateStudentWithPreferenceSchema>;

export async function updateStudentWithPreference(data: UpdateStudentWithPreferenceInput) {
    await requireAuth();

    const parsed = updateStudentWithPreferenceSchema.safeParse(data);
    if (!parsed.success) {
        throw new Error("Invalid data provided");
    }

    const { student: studentData, preferences } = parsed.data;
    const { studentId } = studentData;

    // Use a transaction to ensure both student and preferences are updated atomically
    return prisma.$transaction(async (tx) => {
        // Update the student
        await tx.student.update({
            where: { studentId },
            data: studentData,
        });

        // Update or create preference record
        if (preferences) {
            await tx.studentPreference.upsert({
                where: { studentId },
                update: {
                    preferredSubjects: preferences.preferredSubjects || [],
                    preferredTeachers: preferences.preferredTeachers || [],
                    preferredWeekdays: preferences.preferredWeekdays || [],
                    preferredHours: preferences.preferredHours || [],
                    additionalNotes: preferences.additionalNotes || null,
                },
                create: {
                    studentId,
                    preferredSubjects: preferences.preferredSubjects || [],
                    preferredTeachers: preferences.preferredTeachers || [],
                    preferredWeekdays: preferences.preferredWeekdays || [],
                    preferredHours: preferences.preferredHours || [],
                    additionalNotes: preferences.additionalNotes || null,
                }
            });
        }

        // Fetch and return the updated student with preferences
        return tx.student.findUnique({
            where: { studentId },
            include: { preference: true },
        });
    });
}