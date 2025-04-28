"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";
import { z } from "zod";
import {
  studentCreateSchema,
  StudentCreateInput,
} from "@/schemas/student.schema";
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

  const { username, password, ...rest } = studentData;
  let userId: string | null = null;

  if (username && password) {
    const user = await prisma.user.create({
      data: {
        name: rest.name,
        username,
        passwordHash: password,
        role: "STUDENT",
      },
    });
    userId = user.id;
  }

  const studentDataForPrisma: Prisma.StudentUncheckedCreateInput = {
    ...(rest as Omit<StudentCreateInput, "username" | "password">),
    ...(userId ? { userId } : {}),
    StudentPreference: preferences
      ? {
          create: {
            notes: preferences.additionalNotes ?? null,
            subjects: {
              create: (preferences.preferredSubjects ?? []).map(
                (subjectId) => ({
                  subjectId,
                })
              ),
            },
            teachers: {
              create: (preferences.preferredTeachers ?? []).map(
                (teacherId) => ({
                  teacherId,
                })
              ),
            },
            timeSlots: {
              create: (preferences.desiredTimes ?? []).map((time) => ({
                dayOfWeek: time.dayOfWeek as DayOfWeek,
                startTime: time.startTime, // Ensure this is a DateTime or string in HH:mm format
                endTime: time.endTime, // Ensure this is a DateTime or string in HH:mm format
              })),
            },
          },
        }
      : undefined,
  };

  return prisma.student.create({
    data: studentDataForPrisma,
    include: { StudentPreference: true },
  });
}
