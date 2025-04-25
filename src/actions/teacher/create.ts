"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "../auth-actions";
import { z } from "zod";
import {
  teacherCreateSchema,
  TeacherCreateInput,
} from "@/schemas/teacher.schema";
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

  const { username, password, ...rest } = teacherData;
  let userId: string | null = null;

  if (username && password) {
    const user = await prisma.user.create({
      data: {
        name: rest.name,
        username,
        passwordHash: password,
        role: "TEACHER",
      },
    });
    userId = user.id;
  }

  type TeacherCreateWithoutCred = Omit<
    TeacherCreateInput,
    "username" | "password"
  >;

  const teacherDataForPrisma: Prisma.TeacherUncheckedCreateInput = {
    ...(rest as TeacherCreateWithoutCred),
    ...(userId ? { userId } : {}),
  };

  const teacher = await prisma.teacher.create({
    data: teacherDataForPrisma,
  });

  if (preferences?.desiredTimes?.length) {
    for (const t of preferences.desiredTimes) {
      await prisma.teacherRegularShift.create({
        data: {
          teacherId: teacher.teacherId,
          dayOfWeek: t.dayOfWeek,
          startTime: new Date(`1970-01-01T${t.startTime}:00`),
          endTime: new Date(`1970-01-01T${t.endTime}:00`),
          preferredSubjects: [],
          notes: preferences.additionalNotes,
        },
      });
    }
  }

  return teacher;
}

export async function createTeacher(data: z.infer<typeof teacherCreateSchema>) {
  return createTeacherWithShift({ teacher: data, preferences: undefined });
}
