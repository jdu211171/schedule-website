"use server";

import { studentCreateSchema } from "@/schemas/student.schema";
import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";
import { z } from "zod";
import { studentPreferencesSchema } from "@/schemas/student-preferences.schema";

const createStudentWithPreferenceSchema = z.object({
  student: studentCreateSchema,
  preferences: studentPreferencesSchema.optional(),
});
type CreateStudentWithPreferenceInput = z.infer<
  typeof createStudentWithPreferenceSchema
>;

export async function createStudentWithPreference(
  data: CreateStudentWithPreferenceInput
) {
  await requireAuth();
  const parsed = createStudentWithPreferenceSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data provided");

  const { student: studentData, preferences } = parsed.data;

  return prisma.$transaction(async (tx) => {
    const { gradeId } = studentData;
    const user = await tx.user.create({
      data: {
        username: studentData.username,
        passwordHash: studentData.password,
        role: "STUDENT",
      }
    });

    console.log(gradeId)

    const student = await tx.student.create({
      data: {
        ...studentData,
        userId: user.id,
        gradeId,
        studentRegularPreferences: preferences
          ? {
            create: {
              preferredSubjects: preferences.preferredSubjects ?? [],
              preferredTeachers: preferences.preferredTeachers ?? [],
              preferredWeekdaysTimes: {
                weekdays: preferences.preferredWeekdays ?? [],
                hours: preferences.preferredHours ?? [],
              },
              notes: preferences.additionalNotes ?? null,
            },
          }
          : undefined,
      },
      include: {
        studentRegularPreferences: true,
      },
    });

    return student;
  });
}
