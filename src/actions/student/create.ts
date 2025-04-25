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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { gradeId, username, password, userId, ...rest } = studentData;

    const user = await tx.user.create({
      data: {
        name: rest.name,
        username: username,
        passwordHash: password,
        role: "STUDENT",
      }
    });

    const student = await tx.student.create({
      data: {
        ...rest,
        grade: gradeId ? { connect: { gradeId } } : undefined,
        user: user.id ? { connect: { id: user.id } } : undefined,
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
