"use server";

import { teacherCreateSchema } from "@/schemas/teacher.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { teacherShiftPreferencesSchema } from "@/schemas/teacher-preferences.schema";

const createTeacherWithShiftSchema = z.object({
  teacher: teacherCreateSchema,
  preferences: teacherShiftPreferencesSchema.optional(),
});
type CreateTeacherWithShiftInput = z.infer<typeof createTeacherWithShiftSchema>;

export async function createTeacherWithShift(
  data: CreateTeacherWithShiftInput
) {
  await requireAuth();
  const parsed = createTeacherWithShiftSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data provided");

  const { teacher: teacherData, preferences } = parsed.data;

  return prisma.$transaction(async (tx) => {
    const teacher = await tx.teacher.create({
      data: {
        ...teacherData,
      },
    });

    if (
      preferences &&
      preferences.desiredTimes &&
      preferences.desiredTimes.length > 0
    ) {
      // Create TeacherRegularShift entries for each desired time
      for (const desiredTime of preferences.desiredTimes) {
        await tx.teacherRegularShift.create({
          data: {
            teacherId: teacher.teacherId,
            dayOfWeek: desiredTime.dayOfWeek,
            startTime: new Date(`1970-01-01T${desiredTime.startTime}:00`),
            endTime: new Date(`1970-01-01T${desiredTime.endTime}:00`),
            preferredSubjects: [], // Empty array since we're not handling subjects here
            notes: preferences.additionalNotes,
          },
        });
      }
    }

    return teacher;
  });
}

// Keep the original createTeacher function for backward compatibility
export async function createTeacher(data: z.infer<typeof teacherCreateSchema>) {
  await requireAuth();

  const parsed = teacherCreateSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid data provided");
  }

  await prisma.teacher.create({
    data: parsed.data,
  });

  return parsed.data;
}
