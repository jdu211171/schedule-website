"use server";

import {
  teacherUpdateSchema,
  TeacherUpdateInput,
} from "@/schemas/teacher.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { teacherShiftPreferencesSchema } from "@/schemas/teacher-preferences.schema";

const updateTeacherWithShiftSchema = z.object({
  teacher: teacherUpdateSchema,
  preferences: teacherShiftPreferencesSchema.optional(),
});
type UpdateTeacherWithShiftInput = z.infer<typeof updateTeacherWithShiftSchema>;

export async function updateTeacherWithShift(
  data: UpdateTeacherWithShiftInput
) {
  await requireAuth();
  const parsed = updateTeacherWithShiftSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data provided");

  const { teacher: teacherData, preferences } = parsed.data;
  const { teacherId } = teacherData;

  return prisma.$transaction(async (tx) => {
    // Update teacher information
    await tx.teacher.update({ where: { teacherId }, data: teacherData });

    if (preferences) {
      // Delete existing shifts
      await tx.teacherRegularShift.deleteMany({ where: { teacherId } });

      // Create new shift entries for each desired time
      if (preferences.desiredTimes && preferences.desiredTimes.length > 0) {
        for (const desiredTime of preferences.desiredTimes) {
          await tx.teacherRegularShift.create({
            data: {
              teacherId,
              dayOfWeek: desiredTime.dayOfWeek,
              startTime: new Date(`1970-01-01T${desiredTime.startTime}:00`),
              endTime: new Date(`1970-01-01T${desiredTime.endTime}:00`),
              preferredSubjects: [], // Empty array since we're not handling subjects here
              notes: preferences.additionalNotes,
            },
          });
        }
      }
    }

    // Return the updated teacher
    return tx.teacher.findUnique({
      where: { teacherId },
      include: { teacherRegularShifts: true },
    });
  });
}

// Keep the original updateTeacher function for backward compatibility
export async function updateTeacher(data: TeacherUpdateInput) {
  await requireAuth();

  const parsed = teacherUpdateSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid data provided");
  }

  const { teacherId, ...updateData } = parsed.data;

  await prisma.teacher.update({
    where: { teacherId },
    data: updateData,
  });

  return prisma.teacher.findUnique({
    where: { teacherId },
  });
}
