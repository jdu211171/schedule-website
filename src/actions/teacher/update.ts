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
  const { teacherId, username, password, ...rest } = teacherData;

  return prisma.$transaction(async (tx) => {
    await tx.teacher.update({ where: { teacherId }, data: rest });

    if (preferences) {
      await tx.teacherRegularShift.deleteMany({ where: { teacherId } });
      if (preferences.desiredTimes?.length) {
        for (const t of preferences.desiredTimes) {
          await tx.teacherRegularShift.create({
            data: {
              teacherId,
              dayOfWeek: t.dayOfWeek,
              startTime: new Date(`1970-01-01T${t.startTime}:00`),
              endTime: new Date(`1970-01-01T${t.endTime}:00`),
              preferredSubjects: [],
              notes: preferences.additionalNotes,
            },
          });
        }
      }
    }

    if (username || password) {
      await tx.user
        .update({
          where: { id: teacherId }, // teacherId == user.id の前提
          data: {
            ...(username && { username }),
            ...(password && { passwordHash: password }),
          },
        })
        .catch(() => void 0); // User が無い場合はスルー
    }

    return tx.teacher.findUnique({
      where: { teacherId },
      include: { teacherRegularShifts: true },
    });
  });
}

export async function updateTeacher(data: TeacherUpdateInput) {
  await requireAuth();
  const parsed = teacherUpdateSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data provided");

  const { teacherId, ...rest } = parsed.data;

  await prisma.teacher.update({ where: { teacherId }, data: rest });
  return prisma.teacher.findUnique({ where: { teacherId } });
}
