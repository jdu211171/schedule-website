"use server";

import { studentUpdateSchema } from "@/schemas/student.schema";
import { requireAuth } from "../auth-actions";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { studentPreferencesSchema } from "@/schemas/student-preferences.schema";

const updateStudentWithPreferenceSchema = z.object({
  student: studentUpdateSchema,
  preferences: studentPreferencesSchema.optional(),
});
type UpdateStudentWithPreferenceInput = z.infer<
  typeof updateStudentWithPreferenceSchema
>;

export async function updateStudentWithPreference(
  data: UpdateStudentWithPreferenceInput
) {
  await requireAuth();
  const parsed = updateStudentWithPreferenceSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid data provided");

  const { student: studentData, preferences } = parsed.data;
  const { studentId } = studentData;

  return prisma.$transaction(async (tx) => {
    // 学生情報はそのまま更新
    await tx.student.update({ where: { studentId }, data: studentData });

    if (preferences) {
      await tx.studentRegularPreference.deleteMany({ where: { studentId } });

      await tx.studentRegularPreference.create({
        data: {
          studentId,
          preferredSubjects: preferences.preferredSubjects ?? [],
          preferredTeachers: preferences.preferredTeachers ?? [],
          preferredWeekdaysTimes: preferences.desiredTimes ?? [],
          notes: preferences.additionalNotes ?? null,
        },
      });
    }

    // 最新データを返す
    return tx.student.findUnique({
      where: { studentId },
      include: { studentRegularPreferences: true },
    });
  });
}
